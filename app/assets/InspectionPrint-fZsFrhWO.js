import{a5 as W,J as G,r as N,O as E,j as k}from"./vendor-CdqtCMdM.js";import{p as Q,ag as R,ay as K,ae as V,aj as Y,g as J,az as Z,ak as ee,al as te}from"./index-Dq7_R_Sz.js";import"./threejs-_OBdj44K.js";import"./supabase-CyGKyP1x.js";import"./icons-GXcnUX3Q.js";import"./leaflet-Ctx_fm1t.js";const ae={save:"შენახვა",cancel:"გაუქმება",delete:"წაშლა",edit:"რედაქტირება",add:"დამატება",create:"შექმნა",close:"დახურვა",back:"უკან",done:"დასრულება",next:"შემდეგი",skip:"გამოტოვება",continue:"გაგრძელება",confirm:"დადასტურება",send:"გაგზავნა",resend:"ხელახლა გაგზავნა",remove:"წაშლა",yes:"კი",no:"არა",ok:"კარგი",localeTag:"ka-GE",loading:"იტვირთება…",retry:"ხელახლა ცდა",search:"ძიება",empty:"ცარიელია",draft:"დრაფტი",completed:"დასრულდა",required:"სავალდებულო",optional:"სურვილის შემთხვევაში",all:"ყველა",new:"ახალი",project:"პროექტი",inspection:"შემოწმების აქტი",certificate:"სერტიფიკატი",qualification:"სერტიფიკატები",signature:"ხელმოწერა",signer:"ხელმომწერი",status:"სტატუსი",date:"თარიღი",name:"სახელი",company:"კომპანია",address:"მისამართი",phone:"ტელეფონი",position:"პოზიცია",role:"როლი",email:"ელ-ფოსტა",password:"პაროლი",help:"დახმარება"},ie={close:"დახურვა",closeHint:"შეეხეთ დასახურად",addPhoto:"ფოტოს დამატება",addPhotoHint:"შეეხეთ ახალი ფოტოს ასატვირთად",viewPhoto:"ფოტოს ნახვა",viewPhotoHint:"შეეხეთ ფოტოს დიდად სანახავად",deleteSigner:"მონაწილის წაშლა",deleteSignerHint:"ამ მონაწილის წაშლა",deleteMember:"წაშლა",deleteMemberHint:"მონაწილის წაშლა",addMember:"დამატება",addMemberHint:"ახალი მონაწილის დამატება",saveSignature:"შენახვა",saveSignatureHint:"ხელმოწერის შენახვა",clearSignature:"გასუფთავება",clearSignatureHint:"ხელმოწერის გასუფთავება",selectRole:"აირჩიეთ როლი",selectTemplate:"აირჩიეთ შაბლონი",backToInspection:"შემოწმების აქტი — დაბრუნება",backToInspectionHint:"გადავა შემოწმების აქტის ეკრანზე",retryLoading:"ხელახლა ცდა",newCertificate:"ახალი სერტიფიკატი",newCertificateHint:"სერტიფიკატის დამატება",closeSheet:"დახურვა",closeSheetHint:"ფორმის დახურვა",closePreview:"დახურვა",closePreviewHint:"პრევიუს დახურვა",resumeDraft:"შევსების გაგრძელება",help:"დახმარება"},oe={unknown:"უცნობი შეცდომა",invalidEmailOrPassword:"არასწორი ელ-ფოსტა ან პაროლი",confirmEmailFirst:"გთხოვთ, დაადასტუროთ ელ-ფოსტა, შემდეგ სცადეთ შესვლა",passwordTooShort:"პაროლი უნდა შეიცავდეს მინიმუმ {{min}} სიმბოლოს",tooManyAttempts:"ძალიან ბევრი მცდელობა. მოიცადეთ და კვლავ სცადეთ",network:"ქსელის შეცდომა. შეამოწმეთ ინტერნეტ კავშირი",operationCancelled:"ოპერაცია გაუქმდა",notFound:"მონაცემი ვერ მოიძებნა",forbidden:"წვდომა აკრძალულია",alreadyExists:"უკვე არსებობს",requiredField:"სავალდებულო ველი",invalidPhoneFormat:"ფორმატი: +995 5XX XXX XXX ან 32X XXX XXX",deleteFailed:"წაშლა ვერ მოხერხდა",createFailed:"შექმნა ვერ მოხერხდა",saveFailed:"შენახვა ვერ მოხერხდა",uploadFailed:"ატვირთვა ვერ მოხერხდა",generationFailed:"გენერაცია ვერ მოხერხდა",syncFailed:"სინქრონიზაცია ვერ მოხერხდა",loadFailed:"ჩატვირთვა ვერ მოხერხდა",previewFailed:"პრევიუს ჩატვირთვა ვერ მოხერხდა",invalidAnswerFormat:"პასუხის ფორმატი არასწორია. გთხოვთ, შეასწოროთ.",needsInternetForPhoto:"ფოტოს ასატვირთად საჭიროა ინტერნეტი",cameraPermission:"კამერაზე წვდომა საჭიროა",galleryPermission:"გალერეაზე წვდომა საჭიროა",authRequired:"ავტორიზაცია საჭიროა",photoPermission:"ფოტოზე წვდომა არ არის",notFoundInspection:"შემოწმების აქტი ვერ მოიძებნა",notFoundTemplate:"შაბლონი არ არის",notFoundProject:"პროექტი ვერ მოიძებნა",missingQualification:"აკლია სერტიფიკატები",missingQualificationDesc:"მიუთითეთ: {{types}}",signatureRequired:"ხელმოწერა საჭიროა",signatureRequiredDesc:"PDF-ის დასაგენერირებლად საჭიროა ექსპერტის ხელმოწერა.",missingFields:"შეავსეთ: {{fields}}",pdfNotGeneratedYet:"ჯერ დააგენერირე PDF რეპორტი",inspectionNotSpecified:"შემოწმების აქტი არ არის მითითებული",dataStillLoading:"მონაცემები ჯერ იტვირთება",googleCalendarNotConnected:"ჯერ მიაერთეთ Google კალენდარი",googleSessionExpired:"Google სესია ამოიწურა — შეაერთე თავიდან",googleCalendarDisconnected:"Google კალენდარი გაითიშა",googleCalendarConnected:"Google კალენდარი შეერთდა"},ne={channelName:"შემოწმების აქტის შეხსენება",fallbackItemName:"შემოწმების აქტი",expiringTomorrowTitle:"ვადა გასდის ხვალ",addedToCalendar:"დაემატა: {{count}}",smsSent:"SMS გაიგზავნა",smsResent:"SMS ხელახლა გაიგზავნა",pdfDeleted:"PDF რეპორტი წაიშალა",requestDeleted:"მოთხოვნა წაიშალა",certificateUploaded:"სერტიფიკატი აიტვირთა",photoUploaded:"ფოტო აიტვირთა",photoDeleted:"ფოტო წაიშალა",signatureSaved:"ხელმოწერა შენახულია",projectCreated:"პროექტი შეიქმნა",undoLabel:"დაბრუნება",draftLoaded:"ჩატვირთულია ლოკალური ასლი — სინქრონიზაცია მოხდება ავტომატურად.",deleted:"წაიშალა",languageChanged:"ენა შეიცვალა",signedOut:"გასვლა შესრულდა",signOutFailed:"გასვლა ვერ მოხდა"},se={home:"მთავარი",homeA11y:"მთავარი გვერდი",projects:"პროექტები",projectsA11y:"პროექტების სია",calendar:"კალენდარი",calendarA11y:"კალენდარი — განრიგი",regulations:"რეგულაციები",regulationsA11y:"რეგულაციები და სტანდარტები",more:"მეტი",moreA11y:"დამატებითი მენიუ",backToHome:"მთავარ გვერდზე",backToMore:"მეტი"},re={brand:"Sarke",tagline:"შრომის უსაფრთხოების ექსპერტი",login:"შესვლა",register:"რეგისტრაცია",loginWithGoogle:"Google-ით შესვლა",registerWithGoogle:"Google-ით რეგისტრაცია",forgotPassword:"პაროლი დაგავიწყდა?",resetPassword:"პაროლის აღდგენა",resetSent:`პაროლის განახლების ბმული გაიგზავნა
{{email}}-ზე.`,resetInstructions:"შეიყვანეთ ელ-ფოსტა და გამოგიგზავნებთ პაროლის განახლების ბმულს.",sendLink:"გაგზავნა",enterValidEmail:"გთხოვთ შეიყვანოთ ვალიდური ელ-ფოსტა",passwordMinLength:"პაროლი (მინ. {{min}} სიმბოლო)",emailPlaceholder:"you@example.com",firstName:"სახელი",lastName:"გვარი",firstNamePlaceholder:"გიორგი",lastNamePlaceholder:"ხელაძე",emailAlreadyInUse:"ელ-ფოსტა უკვე გამოიყენება",emailAlreadyInUseDesc:"ამ ელ-ფოსტით ანგარიში უკვე არსებობს. გსურთ შესვლა?",or:"ან",linkSent:"ბმული გაიგზავნა",linkSentBody:"შეამოწმეთ {{email}}. ბმულზე დაჭერით დაბრუნდებით აპლიკაციაში ახალი პაროლის შესაყვანად.",resetTitle:"პაროლის აღდგენა",resetSubtitle:"შეიყვანეთ ელ-ფოსტა და გამოგიგზავნით ბმულს პაროლის შესაცვლელად.",checkEmail:"შეამოწმეთ ელ-ფოსტა",verifyCodeSent:"დადასტურების ბმული გაიგზავნა {{email}}-ზე. დააჭირეთ ბმულს ელ-ფოსტაში, ან შეიყვანეთ კოდი ქვემოთ.",verifyConfirm:"დადასტურება",didntReceiveCode:"კოდი არ მიგიღიათ?",resend:"ხელახლა გაგზავნა",resendIn:"ხელახლა გაგზავნა ({{n}}წ)",codeSent:"კოდი გამოგზავნილია",codeExpired:"კოდის ვადა ამოიწურა. მოითხოვეთ ახალი.",invalidCode:"არასწორი კოდი. გთხოვთ, სცადოთ კიდევ ერთხელ."},le={greetingNight:"მოგესალმებით",greetingMorning:"დილა მშვიდობისა",greetingAfternoon:"გამარჯობა",greetingEvening:"საღამო მშვიდობისა",resumeDraft:"გააგრძელეთ დრაფტი",newInspection:"ახალი შემოწმების აქტი",chooseProjectStart:"აირჩიეთ პროექტი და დაიწყეთ",uploadCertificates:"ატვირთეთ სერტიფიკატები",certExpiring:"{{count}} სერტიფიკატი იწურება",certExpiringSuffix:"სერტიფიკატი იწურება",pdfIncluded:"PDF რეპორტს ავტომატურად ერთვის.",checkDeadlines:"შეამოწმეთ ვადები, სანამ ობიექტი არ გაჩერდება.",sectionProjects:"პროექტები",allProjects:"ყველა",newProject:"ახალი პროექტი",createFirst:"შექმენით პირველი",recentActivity:"ბოლო აქტივობა",recentActs:"ბოლო აქტები",fetchError:"მონაცემები ვერ ჩაიტვირთა — შეამოწმეთ კავშირი და ჩამოათრიეთ განახლებისთვის",allActivity:"ყველა",startInspectionSheetTitle:"შემოწმების აქტის დაწყება",addNewProjectSheet:"ახალი პროექტის დამატება",noProjectsYet:"პროექტი ჯერ არ გაქვს",noProjectsHint:'შეეხეთ "ახალი პროექტის დამატება"',chooseTemplate:"აირჩიეთ შაბლონი",newProjectFormTitle:"ახალი პროექტი",projectNamePlaceholder:"მაგ. ვაკე-საბურთალოს ობიექტი",companyPlaceholder:"შემკვეთი",tipOfDay:"რჩევა დღისთვის",tip1:"ხარაჩოს ინსპექტირებამდე დარწმუნდით, რომ ქამარი და მუზარადი გაქვთ.",tip2:"ქარი 15 მ/წმ-ზე მეტი — შეაჩერეთ სიმაღლის სამუშაოები.",tip3:"ქამრის შემოწმების აქტი: შეამოწმეთ ნაკერები და ბალთები, არა მხოლოდ ზოლი.",tip4:"ფოტოები რეპორტს 3-ჯერ უფრო სანდოს ხდის — გადაიღეთ ყოველი ცვლილება.",tip5:"ხარაჩოს ფეხები უნდა იდგას მტკიცე, თანაბარ ზედაპირზე.",tip6:"ორი დამოუკიდებელი მიბმის წერტილი ყოველთვის უფრო უსაფრთხოა, ვიდრე ერთი.",tip7:"სველი ხარაჩო ორჯერ უფრო საშიშია — შეამოწმეთ ფიცრის ლპობა.",relNow:"ახლა",relMinAgo:"{{n}} წთ. წინ",relHourAgo:"{{n}} სთ. წინ",relDayAgo:"{{n}} დღის წინ"},de={title:"პროექტები",yourProjects:"შენი პროექტები",subtitle:"აქ ჩანს თქვენი ყველა მიმდინარე პროექტი",tapForDetails:"შეეხეთ პროექტს დეტალების სანახავად",addProject:"ახალი პროექტი",addProjectSubtitle:"დაამატე სამშენებლო ობიექტი შემოწმების დასაწყებად",yourProfile:"შენი პროფილი",profileSubtitle:"აქ არის შენი ხელმოწერა და პარამეტრები",noProjects:"ჯერ პროექტი არ არის",noProjectsHint:"შექმენით პირველი პროექტი და დაიწყეთ შემოწმების აქტები",createProject:"+ ახალი პროექტი",changePhoto:"სურათის შეცვლა",createButton:"შექმნა",clientPlaceholder:"შემკვეთი",projectNamePlaceholder:"მაგ. ვაკე-საბურთალოს ობიექტი",nameLabel:"სახელი",companyLabel:"კომპანია",addressLabel:"მისამართი",deleteConfirm:"{{name}} — ყველა შემოწმების აქტსთან ერთად წაიშლება. გავაგრძელოთ?",draft:"დრაფტი",completed:"დასრულდა",tourProjectInfo:"პროექტის ინფო",tourProjectInfoBody:"შეეხეთ ბარათს რედაქტირებისთვის",tourCrew:"მონაწილეები",tourCrewBody:"დაამატეთ გუნდი შემოწმების აქტის დაწყებამდე",tourFiles:"ბრძანებები",tourFilesBody:"აქ იქმნება ბრძანებები და ინახება ფაილები",tourHistory:"შემოწმების აქტები",tourHistoryBody:"თქვენი შემოწმების აქტების ისტორია",tourNewInspection:"ახალი შემოწმების აქტი",tourNewInspectionBody:"დააჭირეთ და დაიწყეთ ახალი შემოწმების აქტი",inspectorFallback:"ინსპექტორი",memberSaveError:"მონაწილე ვერ შეინახა",templateMissing:"შაბლონი არ არის",chooseTemplateTitle:"აირჩიეთ შაბლონი",cancelOption:"გაუქმება",noCompletedInspections:"ჯერ არ არის დასრულებული",logoUpdated:"ლოგო განახლდა",logoSaveFailed:"ლოგო ვერ შეინახა",logoRemove:"ლოგოს წაშლა",galleryAccessDenied:"გალერეაზე წვდომა აკრძალულია",uploaded:"აიტვირთა",fileOpenFailed:"ფაილი ვერ გაიხსნა",saved:"შენახულია",draftsSection:"დრაფტები",completedSection:"დასრულებული",questionnairesSection:"შემოწმების აქტები",participantsSection:"მონაწილეები",edit:"რედაქტირება"},ce={newTitle:"ახალი მონაწილე",editTitle:"მონაწილის რედაქტირება",fullNamePlaceholder:"გიორგი ხელაძე",phonePlaceholder:"+995 5XX XX XX XX",positionPlaceholder:"მაგ. ზედამხედველი",noSignature:"ხელმოწერა შენახული არ არის",drawSignature:"ხელმოწერის დახატვა",redrawSignature:"ხელახლა დახატვა",signatureField:"ხელმოწერა",addButton:"დამატება",saveButton:"შენახვა",clearButton:"გასუფთავება",added:"დაემატა",updated:"განახლდა"},pe={title:"შემოწმების აქტი",backTitle:"მთავარი",notFoundTitle:"შემოწმების აქტი ვერ მოიძებნა",notFoundDesc:"შესაძლოა წაიშალა, ან თქვენ არ გაქვთ წვდომა.",statusSafe:"✓ უსაფრთხოა",statusProblems:"⚠ გამოვლენილია პრობლემები",problemsSection:"გამოვლენილი პრობლემები",checked:"შემოწმდა",problem:"პრობლემა",skipped:"გამოტოვდა",participants:"მონაწილეები",signed:"ხელი მოწერილი",notPresent:"არ ესწრებოდა",pdfGenerateAndSend:"PDF გენერირება და გაგზავნა",pdfPreview:"PDF პრევიუ",pdfReportsCount:"PDF რეპორტები ({{count}})",previewModalTitle:"PDF პრევიუ",previewLoading:"პრევიუ იტვირთება…",safe:"უსაფრთხოა",notSafe:"არ არის უსაფრთხო",remoteNotSent:"არ გაგზავნილა",remoteSent:"გაგზავნილია",remoteSigned:"ხელმოწერილი",remoteDeclined:"უარი თქვა",remoteExpired:"ვადაგასული",sendSms:"SMS-ის გაგზავნა",resendSms:"ხელახლა გაგზავნა",cancelRemote:"გაუქმება",wizardStepConclusion:"დასკვნა",wizardStepHarnessCount:"ქამარების რაოდენობა",wizardStepHarnessCheck:"ქამარების შემოწმება",wizardStepComponent:"კომპონენტი • {{row}}",wizardStepCheck:"შემოწმება",wizardStepMeasure:"გაზომვა",wizardStepNote:"შენიშვნა",wizardStepPhoto:"ფოტო",loadError:"არ მოიძებნა",answerFormatError:"პასუხის ფორმატი არასწორია. გთხოვთ, შეასწოროთ.",loadErrorWithDetail:"ჩატვირთვა ვერ მოხერხდა: {{detail}}",photoUploading:"ფოტოები იტვირთება ({{count}})…",photoUploadingSingle:"ფოტო იტვირთება…",footerComplete:"დასრულება",footerNextAnswered:"შემდეგი",footerNextUnanswered:"გამოტოვება",deleteTitle:"წაშლა?",deleteBody:"შემოწმების აქტი სამუდამოდ წაიშლება.",deleteCancel:"გაუქმება",deleteConfirm:"წაშლა",photoLabel:"ფოტო",noteLabel:"შენიშვნა",textPlaceholder:"შეავსეთ აქ...",missingSafetyStatus:"უსაფრთხოების სტატუსი",missingConclusion:"დასკვნა",missingHarnessName:"ქამრის დასახელება",completeError:"შემოწმების აქტის დასრულება ვერ მოხერხდა: {{detail}}",exitTitle:"გასვლა?",exitBody:"გასვლისას პასუხები შეინახება, მაგრამ შემოწმების აქტი არ დასრულდება.",exitStay:"გაგრძელება",exitLeave:"გასვლა",commentPlaceholder:"კომენტარი",additionalCommentPlaceholder:"დამატებითი კომენტარი (არასავალდებულო)",harnessModelPlaceholder:"მაგ. Petzl NEWTON",describeDetailedPlaceholder:"აღწერეთ დეტალურად...",viewPreview:"პრევიუს ნახვა",viewInspection:"შემოწმების აქტის ნახვა",backToHome:"მთავარ გვერდზე"},ge={title:"PDF რეპორტები",emptyTitle:"PDF რეპორტი ჯერ არ გაქვთ",emptyHint:"დაასრულეთ შემოწმების აქტი და დააგენერირეთ პირველი PDF რეპორტი",emptyAction:"ახალი შემოწმების აქტი",pdfReport:"PDF რეპორტი",deleted:"წაიშალა",deleteError:"ვერ წაიშალა",newTitle:"PDF რეპორტის გენერაცია",qualificationMissingTitle:"სერტიფიკატები არ არის",qualificationMissingDesc:"ატვირთეთ სერტიფიკატი ან ახლავე ატვირთეთ ახალი.",uploadAction:"ატვირთვა",noOtherQualifications:"სხვა სერტიფიკატები არ არის",inspectionLabel:"შემოწმების აქტი",chiefEngineer:"მთავარი ინჟინერი",safetySpecialist:"შრომის უსაფრთხოების სპეციალისტი",drawAction:"დახატვა",changeAction:"შეცვლა",signaturePlaceholder:"ხელმოწერა",otherSigners:"სხვა ხელმომწერები",signerSignatureOf:"{{name}}-ის ხელმოწერა",signatureRequired:"ხელმოწერა საჭიროა",addSignerOptional:"სურვილის შემთხვევაში — დაამატეთ სხვა ხელმომწერი",signerNamePlaceholder:"სახელი გვარი",enterNameFirst:"ჯერ შეიყვანეთ სახელი",newSigner:"ახალი ხელმომწერი",qualificationCerts:"სერტიფიკატები",notSelected:"არ არის არჩეული",uploaded:"ატვირთულია",certNumber:"№ {{number}}",changeCert:"შეცვლა",selectCert:"არჩევა",selectAllRequired:"არჩიე ყველა საჭირო სერტიფიკატი",additionalCerts:"დამატებითი სერტიფიკატები",addOtherQualifications:"სურვილის შემთხვევაში — დაამატეთ სხვა სერტიფიკატი",addButton:"+ დამატება",previewButton:"პრევიუ",generateButton:"PDF-ის გენერაცია",generateSuccess:"PDF რეპორტი შეიქმნა",assetsMissing:"{{count}} სურათი ვერ ჩაიდო — გამოჩნდება ჩანაცვლების ნიშნით.",previewFailedTitle:"პრევიუ ვერ აიწყო",sendSmsSuccess:"SMS გაიგზავნა",expertSignatureNeeded:'ექსპერტის ხელმოწერა საჭიროა — დაამატეთ "ჩემი ხელმოწერა" ეკრანიდან',addLogoTitle:"ლოგოს დამატება",addLogoBody:"პროექტს ჯერ არ აქვს ლოგო. გსურთ მისი დამატება PDF-ის გენერაციამდე?",addLogoAdd:"დამატება",logoSaveFailed:"ლოგო ვერ შეინახა",localCopyMissing:'ამ მოწყობილობაზე ლოკალური ასლი არ არის. დააჭირეთ "გაზიარება".'},ue={title:"სერტიფიკატები",backTitle:"მეტი",requiredCerts:"სავალდებულო სერტიფიკატები",additionalCerts:"დამატებითი სერტიფიკატები"},fe={title:"ისტორია",backTitle:"მეტი",draftsSection:"დრაფტები",completedSection:"დასრულებული",deleteTitle:"წაშლა?",deleteBody:"შემოწმების აქტი სამუდამოდ წაიშლება.",deleted:"წაიშალა",deleteError:"ვერ წაიშალა",inspectionA11y:"შემოწმების აქტი",viewCompleted:"დასრულებული შემოწმების აქტის ნახვა",resumeDraft:"დრაფტის გაგრძელება",emptyTitle:"ისტორია ცარიელია",emptyHint:"დასრულებული შემოწმების აქტები გამოჩნდება აქ",startInspection:"შემოწმების აქტის დაწყება"},me={title:"მეტი",projectsCount:"პროექტი",completedCount:"დასრულდა",draftCount:"დრაფტი",history:"ისტორია",lastInspection:"ბოლო: {{date}}",emptyLast:"ცარიელია",qualifications:"სერტიფიკატები",expiringCount:"{{count}} იწურება",uploadPrompt:"დააჭირეთ ასატვირთად",allActive:"ყველა აქტიური",templates:"შაბლონები",system:"სისტემა",regulations:"რეგულაციები",document:"დოკუმენტი",mySignature:"ჩემი ხელმოწერა",drawSignature:"ხელმოწერის დახატვა",terms:"წესები და პირობები",signOut:"გასვლა",privacyPolicy:"კონფიდენციალურობის პოლიტიკა",privacyNoShare:"Sarke 2.0 არ იზიარებს თქვენს პერსონალურ მონაცემებს მესამე მხარესთან.",privacyPhotos:"ფოტოები და ხელმოწერები ინახება მხოლოდ თქვენს პირად ანგარიშში",privacyPdf:"PDF რეპორტები ხელმისაწვდომია მხოლოდ თქვენთვის და თქვენი ორგანიზაციისთვის",privacyDelete:"მონაცემთა წაშლა შესაძლებელია აპლიკაციის პარამეტრებიდან",privacySupabase:"ყველა მონაცემი დაცულია Supabase-ის უსაფრთხო სერვერებზე",copyright:"© 2026 Sarke 2.0 · ყველა უფლება დაცულია",settings:"პარამეტრები",darkMode:"მუქი რეჟიმი",language:"ენა / Language",pdfLanguage:"PDF ენა",changePassword:"პაროლის შეცვლა",signOutConfirmTitle:"გასვლა",signOutConfirmBody:"დარწმუნებული ხართ?"},he={title:"კალენდარი",sync:"სინქრონიზაცია",filterExpired:"ვადაგასული",filterThisWeek:"ამ კვირას",filterThisMonth:"ამ თვეში",prevMonth:"წინა თვე",nextMonth:"შემდეგი თვე",noTemplate:"შაბლონი არ არის",noProject:"პროექტი ვერ მოიძებნა",chooseTemplate:"აირჩიეთ შაბლონი",createFailed:"შექმნა ვერ მოხერხდა",connectGoogleFirst:"ჯერ მიაერთეთ Google კალენდარი",addedCount:"დაემატა: {{count}}",syncFailed:"სინქრონიზაცია ვერ მოხერხდა",noInspections:"შემოწმების აქტი არ არის ამ დღეს.",today:"დღეს",start:"დაწყება",inspectionCount:"{{count}} შემოწმების აქტი",weekdayLabels:["ორშ","სამ","ოთხ","ხუთ","პარ","შაბ","კვ"],monthLabels:["იანვარი","თებერვალი","მარტი","აპრილი","მაისი","ივნისი","ივლისი","აგვისტო","სექტემბერი","ოქტომბერი","ნოემბერი","დეკემბერი"],monthLabelsShort:["იან","თებ","მარ","აპრ","მაი","ივნ","ივლ","აგვ","სექ","ოქტ","ნოე","დეკ"],filterAll:"ყველა",filterInspection:"შემოწმება",filterBriefing:"ინსტრუქტაჟი",filterOverdue:"ვადა გასული",filterUpcoming:"დაგეგმილი",filterProject:"პროექტი",allProjects:"ყველა პროექტი",goToSite:"დღეს ობიექტზე ვარ",emptyDay:"ამ დღეს მოვლენები არ არის",emptyFilter:"ფილტრი — მოვლენები ვერ მოიძება",allCaughtUp:"ყველა ვადა დაცულია",overdueDays:"{{count}} დღე გადაცილდა",inDays:"{{count}} დღეში",dueToday:"დღეს",jumpToToday:"დღეს",upcomingSection:"შეხსენებები"},ve={title:"რეგულაციები",neverUpdated:"არასდროს",updatedToday:"დღეს, {{time}}",lastUpdate:"ბოლო განახლება: {{date}}",updatedBadge:"განახლდა",updatedDate:"განახლდა: {{date}}",openLinkA11y:"{{title}} — გახსნა",sourceLabel:"matsne.gov.ge"},be={confirmKa:"დადასტურება",confirmEn:"Confirm",declineWarning:"უარის თქმის შემთხვევაში აპლიკაციიდან გამოხვალ.",cancelKa:"გაუქმება",cancelEn:"Cancel",signOutKa:"გასვლა",signOutEn:"Sign out",langKa:"ქართული",langEn:"English",viewInBrowser:"ვერსიის ნახვა ბრაუზერში",agree:"ვეთანხმები",disagree:"არ ვეთანხმები"},xe={saved:"ხელმოწერა შენახულია",saveError:"შენახვა ვერ მოხერხდა",requiredTitle:"ხელმოწერა საჭიროა",requiredDesc:"PDF-ის დასაგენერირებლად საჭიროა ექსპერტის ხელმოწერა.",eyebrow:"ხელმოწერა",fallbackName:"ხელმომწერი",signHereHint:"ხელი მოაწერეთ ჩარჩოში"},ye={title:"ხელმოწერის გარე მოთხოვნა",description:"ხელის მოწერის ლინკი გაიგზავნება SMS-ით. ლინკი 14 დღეში იწურება.",roleLabel:"როლი",nameLabel:"სახელი გვარი",namePlaceholder:"გიორგი ხელაძე",phoneLabel:"ტელეფონი",phonePlaceholder:"+995 5XX XXX XXX",cancel:"გაუქმება",sendSms:"SMS-ის გაგზავნა"},we={rolePresets:["ზედამხედველი","ხარაჩოს ამწყობი"],addSheetTitle:"მონაწილის დამატება",nameLabel:"სახელი",namePlaceholder:"მაგ. გიორგი მელაძე",roleLabel:"როლი",saveButton:"შენახვა"},$e={topics:{scaffold_safety:"ხარაჩოს უსაფრთხოება",height_work:"სიმაღლეზე მუშაობა",ppe:"დამცავი აღჭურვილობა",evacuation:"საევაკუაციო გეგმა",fire_safety:"ხანძარსაწინააღმდეგო",other:"სხვა"}},Se={tocTitle:"შინაარსი",tocQuestionCount:"{{count}} კითხვა",attachedCerts:"თანდართული სერტიფიკატები",certIssued:"გაცემა: {{date}}",certExpires:"ვადა: {{date}}",imageUnavailable:"სურათი მიუწვდომელია",statusNotSafe:"✗ არ არის უსაფრთხო ექსპლუატაციისთვის",statusSafe:"✓ უსაფრთხოა ექსპლუატაციისთვის",statusIncomplete:"● შეფასება დაუსრულებელია",watermarkDraft:"დრაფტი / DRAFT",previewBanner:"👁 PREVIEW — ეს არის PDF-ის პრევიუ. საბოლოო ვერსია შეიძლება განსხვავდებოდეს.",htmlTitle:"Sarke — {{templateName}}",systemName:"შრომის უსაფრთხოების ექსპერტული სისტემა",footerText:"Sarke 2.0 · {{systemName}} · გვერდი ",metaDate:"თარიღი: {{date}}",metaObject:"ობიექტი: {{name}}",metaId:"ID: {{id}}",infoCompany:"კომპანია",infoObject:"ობიექტი",infoHarness:"ქამრის დასახელება",infoStatus:"სტატუსი",conclusionTitle:"დასკვნა",signaturesTitle:"ხელმოწერები",commentLabel:"კომენტარი",notesLabel:"შენიშვნა",photosTitle:"📷 ფოტო მასალა",yes:"კი",no:"არა",expertLabel:"ექსპერტი",timeLabel:"დრო",locationLabel:"ლოკაცია",deviceLabel:"მოწყობილობა",photoAlt:"ფოტო",signatureAlt:"ხელმოწერა"},ke={statusBadgePass:"უსაფრთხოა",statusBadgeFail:"არ არის უსაფრთხო",statusBadgePending:"მოლოდინში",offlineBanner:"ხაზგარეშე — ცვლილებები ინახება ლოკალურად",errorStateTitle:"ვერ ჩაიტვირთა",errorStateRetry:"ხელახლა ცდა",errorBoundaryTitle:"მოხდა შეცდომა",errorBoundarySubtitle:"გთხოვთ, სცადოთ თავიდან",errorBoundaryRetry:"თავიდან ცდა",skeletonMapNoLocation:"ლოკაცია არ დაემატა",skeletonMapAddLocation:"ლოკაციის დამატება"},Pe={expert:"შრომის უსაფრთხოების სპეციალისტი",xarachoSupervisor:"ხარაჩოს ზედამხედველი",xarachoAssembler:"ხარაჩოს ამწყობი",other:"სხვა"},Fe={title:"ანგარიშის პარამეტრები",currentPassword:"მიმდინარე პაროლი",newPassword:"ახალი პაროლი",confirmNewPassword:"გაიმეორეთ ახალი პაროლი",passwordPlaceholder:"პაროლი",repeatPasswordPlaceholder:"გაიმეორეთ პაროლი",changePassword:"პაროლის შეცვლა",changing:"იცვლება…",currentPasswordRequired:"მიმდინარე პაროლი აუცილებელია",currentPasswordWrong:"მიმდინარე პაროლი არასწორია",passwordMinLengthError:"ახალი პაროლი უნდა შეიცავდეს მინიმუმ {{min}} სიმბოლოს",passwordMustDiffer:"ახალი პაროლი უნდა იყოს განსხვავებული",passwordsMismatch:"პაროლები არ ემთხვევა",passwordCharCount:"{{n}}/{{min}} სიმბოლო",passwordChanged:"პაროლი შეიცვალა"},_e={title:"გვერდი არ მოიძებნა",body:"ეს გვერდი არ არსებობს ან წაშლილია.",backHome:"მთავარ გვერდზე"},Ce={common:ae,a11y:ie,errors:oe,notifications:ne,tabs:se,auth:re,home:le,projects:de,projectSigner:ce,inspections:pe,certificates:ge,qualifications:ue,history:fe,more:me,calendar:he,regulations:ve,termsScreen:be,signature:xe,remoteSigner:ye,crew:we,briefings:$e,pdf:Se,components:ke,roles:Pe,account:Fe,notFound:_e};function D(a,e){const c=a.split(".");let s=Ce;for(const t of c)if(s=s==null?void 0:s[t],s===void 0)break;if(typeof s=="string")return e?s.replace(/\{\{(\w+)\}\}/g,(t,r)=>String(e[r]??"")):s}function je(a){const e=new Date(a),c=String(e.getDate()).padStart(2,"0"),s=String(e.getMonth()+1).padStart(2,"0"),t=e.getFullYear(),r=String(e.getHours()).padStart(2,"0"),g=String(e.getMinutes()).padStart(2,"0");return`${c}.${s}.${t} ${r}:${g}`}function M(a){return String(a).padStart(2,"0")}function i(a){return a==null?"":a.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function De(a,e,c,s){var v,b;const t=i(c.slice(0,50)),r=a.created_at?je(a.created_at):"",g=r?`${t} — ${r}`:t,f=((v=a.caption)==null?void 0:v.startsWith("row:"))??!1,l=a.address??((b=a.caption)!=null&&b.startsWith("addr:")?a.caption.slice(5):null);let d="";l?d=`<div class="photo-caption photo-location">გადაღებულია: ${i(l)}</div>`:!f&&a.caption&&(d=`<div class="photo-caption">${i(a.caption)}</div>`);const o=a.storage_path,m=o.startsWith("data:"),y=/^(file|content|ph|asset):\/\//.test(o),j=/^https?:\/\//.test(o);return!m&&!y&&!j?`<div class="photo-item${e?" failed":""}">
      <div class="photo-img-wrap">
        <div class="photo-missing">${s("pdf.imageUnavailable")}</div>
      </div>
      <div class="photo-caption">${g}</div>
      ${d}
    </div>`:`<div class="photo-item${e?" failed":""}">
    <div class="photo-img-wrap">
      <img src="${i(o)}" alt="${i(s("pdf.photoAlt"))}"
        onerror="this.style.display='none';this.parentElement.innerHTML='<div class=\\'photo-missing\\'>${i(s("pdf.imageUnavailable"))}</div>';" />
    </div>
    <div class="photo-caption">${g}</div>
    ${d}
  </div>`}function Te(a){const e=(a??"").trim().toLocaleLowerCase("ka-GE");return e?/(პრობლემ|აღენიშნება|არა|fail|bad|no|broken|damaged|defect)/i.test(e):!1}function Ee(a){const e=(a??"").trim().toLocaleLowerCase("ka-GE");return e?/(პრობლემ|აღენიშნება|არა|fail|bad|no|broken|damaged|defect)/i.test(e)?"fail":/(კი|ok|pass|yes|good|ok\.|ნორმ|გამართულია)/i.test(e)?"pass":/(არ გააჩნია|^na$|n\/a)/i.test(e)?"neutral":null:null}function O(a,e){return a==="pass"?"კი":a==="fail"?"არა":e&&/კი|ok|pass|yes|good|ok\.|ნორმ|გამართულია|არა|fail|bad|no|broken|damaged|defect/i.test(e)?e:"—"}function Le(a,e,c=[],s=!1,t){const r=e!=null&&e.comment?`<div class="question-comment">${t("pdf.commentLabel")}: ${i(e.comment)}</div>`:"",g=e!=null&&e.notes?`<div class="question-notes">${t("pdf.notesLabel")}: ${i(e.notes)}</div>`:"",f=c.length===1?"photo-grid single":"photo-grid",l=c.length>0?`<div class="photo-section-title">${t("pdf.photosTitle")}</div>
         <div class="${f}">${c.map(o=>De(o,s,a.title,t)).join("")}</div>`:"",d=`question-card${s?" is-failed":""}`;switch(a.type){case"yesno":{const o=e==null?void 0:e.value_bool,m=o===!0?`<span class="answer-pill pill-yes">✓ ${t("pdf.yes")}</span>`:o===!1?`<span class="answer-pill pill-no">✗ ${t("pdf.no")}</span>`:'<span class="pill-empty">—</span>';return`<div class="${d}">
        <div class="question-title">${i(a.title)}</div>
        <div class="question-answer">${m}</div>
        ${r}${g}${l}
      </div>`}case"measure":{const o=e==null?void 0:e.value_num;return`<div class="${d}">
        <div class="question-title">${i(a.title)}</div>
        <div class="question-answer">${o??"—"} ${i(a.unit??"")}</div>
        ${r}${g}${l}
      </div>`}case"freetext":return`<div class="${d}">
        <div class="question-title">${i(a.title)}</div>
        <div class="question-answer">${i((e==null?void 0:e.value_text)??"—")}</div>
        ${r}${g}${l}
      </div>`;case"photo_upload":return`<div class="${d}">
        <div class="question-title">${i(a.title)}</div>
        ${l}${r}${g}
      </div>`;case"component_grid":{const o=a.grid_rows??[],m=a.grid_cols??[],y=(e==null?void 0:e.grid_values)??{},j=m.map(b=>`<th>${i(b)}</th>`).join(""),v=o.map(b=>{const S=m.map(F=>{var _;return((_=y[b])==null?void 0:_[F])??""}),P=S.some(F=>Te(F)),T=m.map((F,_)=>{const h=S[_],w=Ee(h);return w==="pass"?`<td><span class="cell-status cell-status--pass">${i(O("pass",h))}</span></td>`:w==="fail"?`<td><span class="cell-status cell-status--fail">${i(O("fail",h))}</span></td>`:w==="neutral"?`<td><span class="cell-status cell-status--neutral">${i(O("neutral",h))}</span></td>`:`<td>${i(h)}</td>`}).join("");return`<tr${P?' class="is-problem"':""}><th>${i(b)}</th>${T}</tr>`}).join("");return`<div class="${d}">
        <div class="question-title">${i(a.title)}</div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th></th>${j}</tr></thead>
            <tbody>${v}</tbody>
          </table>
        </div>
        ${r}${g}${l}
      </div>`}default:return""}}const ze={expert:"შრომის უსაფრთხოების სპეციალისტი",xaracho_supervisor:"ხარაჩოს ზედამხედველი",xaracho_assembler:"ხარაჩოს ამწყობი",other:"სხვა"};function Ae(a){const e=/^data:image\/\w+;base64,.{32,}$/,c=a.filter(t=>t.status==="signed"&&!!t.signature_png_url&&e.test(t.signature_png_url));return[...c.filter(t=>t.signer_role==="expert"),...c.filter(t=>t.signer_role!=="expert")].map(t=>{const r=t.signer_role,g=r?r==="expert"?D("pdf.expertLabel")??"Expert":D(`roles.${r.replace(/_([a-z])/g,(m,y)=>y.toUpperCase())}`)??ze[r]??r:"ხელმომწერი",f=t.signed_at?new Date(t.signed_at).toLocaleDateString("ka-GE"):"",l=t.signed_at?new Date(t.signed_at).toLocaleTimeString("ka-GE",{hour:"2-digit",minute:"2-digit"}):"",d=[];f&&d.push(`<strong>${D("pdf.timeLabel")}:</strong> ${f} ${l}`),t.latitude!=null&&t.longitude!=null&&d.push(`<strong>${D("pdf.locationLabel")}:</strong> ${t.latitude.toFixed(5)}, ${t.longitude.toFixed(5)}`),t.device_id_hash&&d.push(`<strong>${D("pdf.deviceLabel")}:</strong> ${i(t.device_id_hash.slice(0,8))}…`),t.ip_address&&d.push(`<strong>IP:</strong> ${i(t.ip_address)}`);const o=d.length?`<div class="audit-trail">${d.join(" · ")}</div>`:"";return`
      <div class="sig-block${t.signer_role==="expert"?" is-expert":""}">
        <div class="sig-name">${i(t.full_name||"—")}</div>
        <div class="sig-role">${i(g)}</div>
        ${t.position?`<div class="sig-position">${i(t.position)}</div>`:""}
        <div class="sig-img-box">
          <img src="${i(t.signature_png_url??"")}" alt="${i(D("pdf.signatureAlt")??"Signature")}" />
        </div>
        ${f?`<div class="sig-date">${i(f)}</div>`:""}
        ${o}
      </div>`}).join("")}function qe(a){if(a.logo)return`<img class="project-brand-logo" src="${i(a.logo)}" alt="${i(a.company_name||a.name)}" />`;const e=(a.company_name||a.name||"").trim(),c=e?Array.from(e).slice(0,2).join("").toLocaleUpperCase("ka-GE"):"—";return`<div class="project-brand-initials">${i(c)}</div>`}function Be(a){const{isPdf:e}=a;return`
    :root {
      --green: #1D9E75;
      --green-dark: #147A4F;
      --green-tint: #E8F5F0;
      --red: #DC2626;
      --red-tint: #FCEBEB;
      --amber: #B45309;
      --amber-bg: #FEF3C7;
      --ink: #111827;
      --ink-soft: #4B5563;
      --gray: #9CA3AF;
      --line: #E5E7EB;
      --bg-soft: #FAFAFA;
      --radius: 8px;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Helvetica, Arial, sans-serif;
      color: var(--ink);
      line-height: 1.55;
      background: #ffffff;
      ${e?"padding: 20px;":"padding: 16px;"}
      font-size: 11px;
    }

    /* @page margins removed — caused hangs on iOS WKWebView print renderer.
       Body padding (20px) provides sufficient margin instead. */

    /* Watermark */
    .watermark {
      position: fixed;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%) rotate(-35deg);
      font-size: 96px;
      color: rgba(180, 180, 180, 0.12);
      font-weight: 800;
      pointer-events: none;
      z-index: 0;
      letter-spacing: 8px;
      white-space: nowrap;
    }

    /* ── Header ── */
    .report-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      padding-bottom: 16px;
      margin-bottom: 0;
      position: relative;
      z-index: 1;
    }
    .header-left { display: flex; align-items: center; gap: 14px; flex: 1; }
    .header-center {
      flex: 2;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 0 8px;
    }
    .report-title {
      font-size: 18px;
      font-weight: 800;
      color: var(--ink);
      line-height: 1.3;
    }
    .project-brand-logo {
      width: 60px; height: 60px;
      border-radius: 50%;
      object-fit: cover;
      display: block;
    }
    .project-brand-initials {
      width: 60px; height: 60px;
      border-radius: 50%;
      background: var(--green);
      color: #fff;
      font-weight: 700;
      font-size: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .brand-name {
      font-size: 26px;
      font-weight: 800;
      color: var(--green);
      letter-spacing: 1px;
      line-height: 1.1;
    }
    .brand-sub {
      font-size: 9px;
      color: var(--gray);
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 600;
      margin-top: 4px;
    }
    .header-right {
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 6px;
    }
    .report-id {
      font-family: monospace;
      font-size: 10px;
      color: var(--gray);
      letter-spacing: 0.5px;
    }
    .header-rule {
      border: none;
      border-top: 3px solid var(--green);
      margin: 0 0 20px;
    }

    /* ── Info block ── */
    .info-card {
      border: 1px solid var(--line);
      border-radius: var(--radius);
      padding: 16px;
      margin-bottom: 16px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px 24px;
      position: relative;
      z-index: 1;
    }
    .info-row { display: flex; flex-direction: column; gap: 2px; }
    .info-label {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--gray);
      font-weight: 600;
    }
    .info-value {
      font-size: 13px;
      color: var(--ink);
      font-weight: 600;
    }

    /* ── Status Hero ── */
    .status-hero {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      width: 100%;
      padding: 16px 20px;
      border-radius: var(--radius);
      color: #fff;
      margin-bottom: 16px;
      ${e?"page-break-inside: avoid;":""}
    }
    .hero-pass { background: var(--green); }
    .hero-fail { background: var(--red); }
    .hero-pending { background: var(--amber); }
    .status-hero-icon {
      font-size: 30px;
      font-weight: 700;
      line-height: 1;
    }
    .status-hero-text {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }

    /* Inline status badge (used inside conclusion card) */
    .status-badge {
      display: inline-block;
      padding: 6px 14px;
      border-radius: 20px;
      font-weight: 700;
      font-size: 12px;
      letter-spacing: 0.3px;
    }
    .status-pass { background: var(--green-tint); color: var(--green-dark); }
    .status-fail { background: var(--red-tint); color: var(--red); }
    .status-pending { background: var(--amber-bg); color: var(--amber); }

    /* ── TOC ── */
    .toc-box {
      border: 1px solid var(--line);
      border-radius: var(--radius);
      padding: 16px;
      margin-bottom: 16px;
      position: relative;
      z-index: 1;
    }
    .toc-heading {
      font-size: 10px;
      font-weight: 700;
      color: var(--gray);
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 10px;
    }
    .toc-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 0;
      border-bottom: 1px solid #F3F4F6;
    }
    .toc-item:last-child { border-bottom: none; }
    .toc-num {
      font-family: monospace;
      font-size: 12px;
      font-weight: 700;
      color: var(--green);
      min-width: 24px;
    }
    .toc-name { flex: 1; font-size: 12px; color: var(--ink); font-weight: 500; }
    .toc-count { font-size: 10px; color: var(--gray); font-weight: 600; }

    /* ── Section ── */
    .section {
      margin-bottom: 24px;
      position: relative;
      z-index: 1;
    }
    .section-header { margin-bottom: 4px; margin-top: 8px; }
    .section-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--ink);
      border-left: 3px solid var(--green);
      padding-left: 10px;
      display: flex;
      align-items: baseline;
      gap: 6px;
    }
    .section-num {
      color: var(--green);
      font-weight: 800;
    }
    .section-pipe { color: var(--green); font-weight: 700; margin: 0 2px; }
    .section-name { color: var(--ink); }

    /* ── Question card ── */
    .question-card {
      background: #fff;
      border: 1px solid #E8E6E0;
      border-radius: var(--radius);
      padding: 12px;
      margin-bottom: 8px;
      ${e?"page-break-inside: avoid;":""}
    }
    .question-card.is-failed {
      border-left: 3px solid var(--red);
    }
    .question-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--ink);
      margin-bottom: 8px;
    }
    .question-answer { font-size: 12px; color: var(--ink-soft); margin-bottom: 4px; }
    .answer-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 12px;
      border-radius: 16px;
      font-weight: 700;
      font-size: 11px;
      letter-spacing: 0.3px;
    }
    .pill-yes { background: var(--green-tint); color: var(--green-dark); }
    .pill-no  { background: var(--red-tint); color: var(--red); }
    .pill-empty { color: var(--gray); font-style: italic; font-size: 12px; }

    .question-comment {
      font-size: 11px;
      color: var(--ink-soft);
      font-style: italic;
      margin: 8px 0 0;
      padding: 8px 10px;
      background: var(--bg-soft);
      border-radius: 6px;
      border-left: 3px solid var(--line);
    }
    .question-notes {
      font-size: 11px;
      color: var(--amber);
      font-style: italic;
      margin: 8px 0 0;
      padding: 8px 10px;
      background: #FFFBEB;
      border-radius: 6px;
      border-left: 3px solid #F59E0B;
    }

    /* ── Photo grid ── */
    .photo-section-title {
      font-size: 10px;
      font-weight: 600;
      color: var(--gray);
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin: 12px 0 8px;
    }
    .photo-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-top: 8px;
    }
    .photo-grid.single { grid-template-columns: 1fr; }
    .photo-item {
      border: 1px solid var(--line);
      border-radius: var(--radius);
      overflow: hidden;
      background: #fff;
    }
    .photo-img-wrap {
      width: 100%;
      max-height: 200px;
      overflow: hidden;
      background: var(--bg-soft);
    }
    .photo-item img {
      width: 100%;
      max-height: 200px;
      object-fit: cover;
      display: block;
    }
    .photo-caption {
      font-size: 9px;
      color: var(--gray);
      text-align: center;
      padding: 5px 8px;
    }
    .photo-location {
      color: var(--ink-soft);
      font-style: italic;
    }
    .photo-missing {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 160px;
      background: var(--bg-soft);
      font-size: 10px;
      color: var(--gray);
    }

    /* ── Component table ── */
    .table-wrap {
      border: 1px solid var(--line);
      border-radius: var(--radius);
      overflow: hidden;
      margin-top: 8px;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    .data-table thead th { background: #F5F3EE; color: var(--ink); }
    .data-table th {
      padding: 8px 10px;
      text-align: left;
      font-weight: 700;
      font-size: 10px;
    }
    .data-table tbody th {
      background: var(--bg-soft);
      color: var(--ink);
      font-weight: 600;
    }
    .data-table td {
      padding: 8px 10px;
      border-top: 1px solid #F3F4F6;
      color: var(--ink);
    }
    .data-table tbody tr:nth-child(even) td,
    .data-table tbody tr:nth-child(even) th { background: #FAFAFA; }
    .data-table tbody tr.is-problem td,
    .data-table tbody tr.is-problem th {
      background: var(--red-tint);
      border-left: 3px solid var(--red);
    }
    .cell-status { font-weight: 700; }
    .cell-status--pass { color: var(--green-dark); }
    .cell-status--fail { color: var(--red); }
    .cell-status--neutral { color: var(--gray); }

    /* ── Conclusion ── */
    .conclusion-card {
      background: #fff;
      border: 1px solid var(--line);
      border-left: 4px solid var(--green);
      border-radius: var(--radius);
      padding: 18px 20px;
      margin: 16px 0;
      ${e?"page-break-inside: avoid;":""}
      position: relative;
      z-index: 1;
    }
    .conclusion-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--green);
      font-weight: 700;
      margin-bottom: 8px;
    }
    .conclusion-text {
      font-size: 14px;
      color: var(--ink);
      line-height: 1.7;
      margin-bottom: 12px;
    }

    /* ── Signatures ── */
    .signatures-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 24px 0 12px;
      position: relative;
      z-index: 1;
    }
    .signatures-header-text {
      font-size: 14px;
      font-weight: 700;
      color: var(--ink);
    }
    .signatures-header-rule { flex: 1; height: 1px; background: var(--line); }
    .sig-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      position: relative;
      z-index: 1;
    }
    .sig-block {
      background: #fff;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      padding: 14px;
      ${e?"page-break-inside: avoid;":""}
    }
    .sig-block.is-expert {
      background: var(--green-tint);
      border-color: var(--green);
    }
    .sig-name {
      font-size: 14px;
      font-weight: 700;
      color: var(--ink);
      margin-bottom: 2px;
    }
    .sig-role {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--gray);
      font-weight: 600;
      margin-bottom: 2px;
    }
    .sig-position {
      font-size: 11px;
      color: var(--ink-soft);
      margin-bottom: 10px;
    }
    .sig-img-box {
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 8px;
      background: #fff;
      height: 70px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .sig-img-box img {
      max-width: 160px;
      max-height: 80px;
      display: block;
    }
    .sig-date {
      font-size: 10px;
      color: var(--gray);
      margin-top: 8px;
    }

    .audit-trail {
      font-size: 9px;
      color: var(--gray);
      margin-top: 8px;
      border-top: 1px solid var(--line);
      padding-top: 6px;
      text-align: left;
      line-height: 1.5;
    }
    .audit-trail strong { color: var(--ink-soft); font-weight: 600; }

    /* ── Certificates ── */
    .cert-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .cert-card {
      background: #fff;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      padding: 14px;
      ${e?"page-break-inside: avoid;":""}
    }
    .cert-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--ink);
      margin: 0 0 6px;
    }
    .cert-meta-row {
      font-size: 11px;
      color: var(--ink-soft);
      margin-bottom: 2px;
    }
    .cert-meta-label { color: var(--gray); font-weight: 600; }
    .cert-img-wrap {
      position: relative;
      margin-top: 10px;
      width: 100%;
      /* padding-top % gives a 16:9 box in every engine; aspect-ratio is not
         honored by the expo-print/WKWebView print path and collapses to 0. */
      padding-top: 56.25%;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid var(--line);
      background: var(--bg-soft);
    }
    .cert-img {
      position: absolute;
      top: 0;
      left: 0;
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    @media print {
      .question-card, .photo-item, .sig-block, .section,
      .conclusion-card, .cert-card, .status-hero {
        page-break-inside: avoid;
      }
    }
`}function Ie(a){var p;const{questionnaire:e,template:c,project:s,questions:t,answers:r,signatures:g,photosByAnswer:f={},attachments:l=[],mode:d="pdf"}=a,o=(n,u)=>D(n,u)??n,m=d==="pdf",y=e.status!=="completed",j=n=>r.find(u=>u.question_id===n.id),v=e.created_at?new Date(e.created_at).toLocaleDateString("ka-GE",{year:"numeric",month:"long",day:"numeric"}):"—",b=e.id.slice(0,8).toUpperCase();let S=null;e:for(const n of Object.values(f))for(const u of n){const C=u.address??((p=u.caption)!=null&&p.startsWith("addr:")?u.caption.slice(5):null);if(C){S=C;break e}}const P=Array.from(new Set(t.map(n=>n.section))).sort((n,u)=>n-u),T=P.map((n,u)=>{const C=t.filter($=>$.section===n);return`<div class="toc-item"><span class="toc-num">${M(u+1)}</span><span class="toc-name">${i(String(n))}</span><span class="toc-count">${o("pdf.tocQuestionCount",{count:C.length})}</span></div>`}).join(""),L=P.map((n,u)=>{const C=t.filter($=>$.section===n).sort(($,x)=>$.order-x.order).map($=>{const x=j($),X=x?f[x.id]??[]:[],U=(x==null?void 0:x.value_bool)===!1;return Le($,x,X,U,o)}).join("");return`
        <div class="section">
          <div class="section-header">
            <h2 class="section-title">
              <span class="section-num">${M(u+1)}</span>
              <span class="section-pipe">|</span>
              <span class="section-name">${i(String(n))}</span>
            </h2>
          </div>
          <div class="section-body">${C}</div>
        </div>
      `}).join(""),F=Ae(g),_=l.length>0?`
        <div class="section" ${m?'style="page-break-before: always;"':""}>
          <div class="section-header">
            <h2 class="section-title">
              <span class="section-num">${M(P.length+1)}</span>
              <span class="section-pipe">|</span>
              <span class="section-name">${o("pdf.attachedCerts")}</span>
            </h2>
          </div>
          <div class="cert-grid">
            ${l.map(n=>`
              <div class="cert-card">
                <div class="cert-title">${i(n.cert_type)}</div>
                ${n.cert_number?`<div class="cert-meta-row"><span class="cert-meta-label">№</span> ${i(n.cert_number)}</div>`:""}
                ${n.photo_data_url?`<div class="cert-img-wrap">
                      <img src="${n.photo_data_url}" alt="${i(n.cert_type)}" class="cert-img"
                        onerror="this.style.display='none';this.parentElement.innerHTML='<div class=\\'photo-missing\\'>${i(o("pdf.imageUnavailable"))}</div>';" />
                    </div>`:""}
              </div>
            `).join("")}
          </div>
        </div>
      `:"",h=e.is_safe_for_use===!0,w=e.is_safe_for_use===!1,z=h?"hero-pass":w?"hero-fail":"hero-pending",A=h?"✓":w?"⚠":"…",q=o(h?"pdf.statusSafe":w?"pdf.statusNotSafe":"pdf.statusIncomplete"),B=`
    <div class="status-hero ${z}">
      <span class="status-hero-icon">${A}</span>
      <span class="status-hero-text">${q}</span>
    </div>
  `,I=w?`<span class="status-badge status-fail">${o("pdf.statusNotSafe")}</span>`:h?`<span class="status-badge status-pass">${o("pdf.statusSafe")}</span>`:`<span class="status-badge status-pending">${o("pdf.statusIncomplete")}</span>`,H=y?`<div class="watermark">${o("pdf.watermarkDraft")}</div>`:"";return`<!DOCTYPE html>
<html lang="ka">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${o("pdf.htmlTitle",{templateName:i(c.name)})}</title>
  <style>${Be({isPdf:m})}</style>
</head>
<body>
  ${H}

  <div class="report-header">
    <div class="header-left">
      ${qe(s)}
    </div>
    <div class="header-center">
      <div class="report-title">${i(c.name)}</div>
    </div>
    <div class="header-right">
      <div class="report-id">${b}</div>
    </div>
  </div>
  <hr class="header-rule" />

  <div class="info-card">
    <div class="info-row">
      <span class="info-label">${o("pdf.infoCompany")}</span>
      <span class="info-value">${i(s.company_name)}</span>
    </div>
    <div class="info-row">
      <span class="info-label">${o("pdf.infoObject")}</span>
      <span class="info-value">${i(s.address??"—")}</span>
    </div>
    <div class="info-row">
      <span class="info-label">${o("pdf.metaDate",{date:""}).replace(/[:：].*/,"").trim()||"თარიღი"}</span>
      <span class="info-value">${v}</span>
    </div>
    <div class="info-row">
      <span class="info-label">ID</span>
      <span class="info-value" style="font-family:'SF Mono','Menlo',monospace;font-size:12px;">${b}</span>
    </div>
    ${c.category==="harness"?`
    <div class="info-row" style="grid-column:1 / -1;">
      <span class="info-label">${o("pdf.infoHarness")}</span>
      <span class="info-value">${i(e.harness_name??"—")}</span>
    </div>`:""}
    ${S?`
    <div class="info-row" style="grid-column:1 / -1;">
      <span class="info-label">📍 ლოკაცია</span>
      <span class="info-value">${i(S)}</span>
    </div>`:""}
  </div>

  ${B}

  <div class="toc-box">
    <div class="toc-heading">${o("pdf.tocTitle")}</div>
    ${T}
    ${l.length>0?`
    <div class="toc-item">
      <span class="toc-num">${M(P.length+1)}</span>
      <span class="toc-name">${o("pdf.attachedCerts")}</span>
      <span class="toc-count">${l.length}</span>
    </div>`:""}
  </div>

  ${L}

  <div class="conclusion-card">
    <div class="conclusion-label">${o("pdf.conclusionTitle")}</div>
    <div class="conclusion-text">${i(e.conclusion_text??"—")}</div>
    ${I}
  </div>

  <div class="signatures-header">
    <span class="signatures-header-text">${o("pdf.signaturesTitle")}</span>
    <div class="signatures-header-rule"></div>
  </div>
  <div class="sig-grid">${F}</div>

  ${_}
</body>
</html>`}function Ue(){var h,w,z,A,q,B,I,H;const{id:a}=W(),[e]=G(),c=e.get("preview")==="1",s=N.useRef(null),t=E({queryKey:R.detail(a),queryFn:()=>Y(a),enabled:!!a}),r=E({queryKey:Q.detail((h=t.data)==null?void 0:h.project_id),queryFn:()=>J(t.data.project_id),enabled:!!((w=t.data)!=null&&w.project_id)}),g=E({queryKey:["template",(z=t.data)==null?void 0:z.template_id],queryFn:()=>Z(t.data.template_id),enabled:!!((A=t.data)!=null&&A.template_id)}),f=E({queryKey:R.questions((q=t.data)==null?void 0:q.template_id),queryFn:()=>ee(t.data.template_id),enabled:!!((B=t.data)!=null&&B.template_id)}),l=E({queryKey:R.answers(a),queryFn:()=>te(a),enabled:!!a}),[d,o]=N.useState({}),[m,y]=N.useState(!1);N.useEffect(()=>{if(!l.data)return;const p=l.data.map(n=>n.id);if(!p.length){y(!0);return}K(p).then(async n=>{const u={};await Promise.all(Object.entries(n).map(async([C,$])=>{u[C]=await Promise.all($.map(async x=>{try{const X=await V(x.storage_path);return{...x,storage_path:X}}catch{return x}}))})),o(u),y(!0)}).catch(()=>y(!0))},[l.data]);const j=t.isSuccess&&r.isSuccess&&g.isSuccess&&f.isSuccess&&l.isSuccess&&m;if(t.isLoading)return k.jsx("p",{style:{padding:24},children:"იტვირთება…"});if(!t.data)return k.jsx("p",{style:{padding:24},children:"აქტი ვერ მოიძებნა."});if(!j)return k.jsx("p",{style:{padding:24},children:"იტვირთება…"});const v=t.data,b=r.data,S=g.data,P=f.data??[],T=l.data??[],L=(v.signatories??[]).map(p=>({id:"",inspection_id:v.id,signer_role:p.role,full_name:p.name,phone:null,position:null,signature_png_url:p.signature.startsWith("data:")?p.signature:`data:image/png;base64,${p.signature}`,signed_at:p.signed_at,status:"signed",person_name:null})),F=S||{id:v.template_id,owner_id:null,name:"შემოწმების აქტი",category:((H=(I=v.template)==null?void 0:I[0])==null?void 0:H.category)??null,is_system:!1,required_qualifications:[],required_signer_roles:[]},_=Ie({questionnaire:v,template:F,project:b,questions:P,answers:T,signatures:L,photosByAnswer:d,mode:"pdf"});return k.jsxs(k.Fragment,{children:[k.jsxs("div",{style:{position:"sticky",top:0,background:"#FAFAFA",borderBottom:"1px solid #E5E7EB",padding:"10px 16px",display:"flex",gap:8,justifyContent:"flex-end",zIndex:10},children:[k.jsx("button",{onClick:()=>window.history.back(),style:{padding:"6px 14px",borderRadius:6,fontSize:13,fontWeight:600,cursor:"pointer",border:"1px solid #D1D5DB",background:"#fff"},children:"დახურვა"}),k.jsx("button",{onClick:()=>{var p,n;return(n=(p=s.current)==null?void 0:p.contentWindow)==null?void 0:n.print()},style:{padding:"6px 14px",borderRadius:6,fontSize:13,fontWeight:600,cursor:"pointer",border:"1px solid #2F855A",background:"#2F855A",color:"#fff"},children:"ბეჭდვა"})]}),k.jsx("iframe",{ref:s,srcDoc:_,style:{width:"100%",height:"calc(100vh - 53px)",border:"none",display:"block"},title:"შემოწმების აქტი",onLoad:()=>{var p,n;c||(n=(p=s.current)==null?void 0:p.contentWindow)==null||n.print()}})]})}export{Ue as default};
