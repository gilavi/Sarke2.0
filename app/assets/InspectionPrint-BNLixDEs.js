import{ap as W,ah as V,H as Q,r as R,Z as $,k as w}from"./vendor-BMYLj6rE.js";import{p as K,a9 as z,aj as Y,ak as Z,j as J,al as ee,am as te,an as ae}from"./index-B-4iyvtm.js";import{s as ie}from"./photoUpload-BKcO-TIb.js";import"./rnw-Ctlgrs2k.js";import"./threejs-CZ8NVfN9.js";import"./supabase-DLsv1lFv.js";import"./icons-C25fPDBb.js";import"./leaflet-CyNwFjYR.js";const oe={act:{title:"აქტი მზადაა",subtitle:"შემოწმება შენახულია."},incident:{title:"ინციდენტი მზადაა",subtitle:"ინციდენტი დარეგისტრირდა და დაფიქსირდა."},report:{title:"რეპორტი მზადაა",subtitle:"ანგარიში შენახულია. PDF მზადაა გასაზიარებლად."},instruction:{title:"ინსტრუქტაჟი მზადაა",subtitle:"ინსტრუქტაჟი დასრულდა. ოქმი მზადაა გასაზიარებლად."},order:{title:"ბრძანება მზადაა",subtitle:"დაამატეთ ხელმოწერის ველები და გააზიარეთ PDF."},signatures:{heading:"ხელმოწერები",viewOnly:"მხოლოდ ნახვა",addPerson:"პირის დამატება",addHint:"ცარიელი ველი ხელმოსაწერად",signed:"ხელმოწერილია",awaiting:"ელოდება",you:"შენ",participant:"მონაწილე",blankLine:"ხელმოწერის ველი",emptyField:"ცარიელი ველი"},certificates:{heading:"სერტიფიკატები",add:"სერტიფიკატის დამატება",addHint:"სისტემიდან ან ატვირთვით",attached:"დართული"},status:{safe:"უსაფრთხოა",severe:"მძიმე ინციდენტი"},actions:{sharePdf:"PDF-ის გაზიარება",sharePdfLocked:"PDF-ის ლიმიტი ამოიწურა",backHome:"მთავარ გვერდზე დაბრუნება"},a11y:{back:"უკან რედაქტირებაში",openSignatures:"ხელმოწერების მართვა",viewSignatures:"ხელმოწერების ნახვა"}},ne={info:{heading:"ინფორმაცია",project:"პროექტი",object:"ობიექტი",location:"ადგილი",date:"თარიღი",expert:"ექსპერტი",expertRole:"შრომის უსაფრთხოების ექსპერტი",topic:"თემა",period:"პერიოდი",code:"კოდი",injured:"დაშავებული",role:"როლი",witnesses:"მოწმეები",participants:"მონაწილეები"},tabs:{info:"ინფო",signatures:"ხელმოწერა",certificates:"სერტიფიკატი"},content:{act:"შემოწმების პუნქტები",incident:"ინციდენტის აღწერა",report:"სლაიდები",instruction:"თემა",ok:"გამართულია",issue:"ხარვეზი",empty:"ცარიელია",notes:"შენიშვნები",photos:"ფოტოები"},type:{act:"შემოწმების აქტი",incident:"ინციდენტის აქტი",report:"რეპორტი",instruction:"ინსტრუქტაჟის ოქმი"},actions:{edit:"რედაქტირება",duplicate:"დუბლირება",delete:"წაშლა",sharePdf:"PDF-ის გაზიარება"},duplicate:{done:"დაკოპირდა ახალ დრაფტად",failed:"დუბლირება ვერ მოხერხდა"},delete:{title:"დოკუმენტის წაშლა",confirm:"ნამდვილად წაშალო ეს დოკუმენტი?"},a11y:{back:"უკან"}},se={save:"შენახვა",cancel:"გაუქმება",delete:"წაშლა",edit:"რედაქტირება",add:"დამატება",create:"შექმნა",close:"დახურვა",back:"უკან",done:"დასრულება",next:"შემდეგი",skip:"გამოტოვება",continue:"გაგრძელება",confirm:"დადასტურება",send:"გაგზავნა",resend:"ხელახლა გაგზავნა",remove:"წაშლა",yes:"კი",no:"არა",ok:"კარგი",localeTag:"ka-GE",loading:"იტვირთება…",retry:"ხელახლა ცდა",search:"ძიება",empty:"ცარიელია",draft:"დრაფტი",completed:"დასრულდა",required:"სავალდებულო",optional:"სურვილის შემთხვევაში",all:"ყველა",new:"ახალი",project:"პროექტი",inspection:"შემოწმების აქტი",certificate:"სერტიფიკატი",qualification:"სერტიფიკატები",signature:"ხელმოწერა",signer:"ხელმომწერი",status:"სტატუსი",date:"თარიღი",name:"სახელი",company:"კომპანია",address:"მისამართი",phone:"ტელეფონი",position:"პოზიცია",role:"როლი",email:"ელ-ფოსტა",password:"პაროლი",help:"დახმარება",error:"შეცდომა",viewAction:"ნახვა",areYouSure:"დარწმუნებული ხართ?",deleteFailed:"წაშლა ვერ მოხერხდა",requiredField:"სავალდებულო ველი"},re={close:"დახურვა",closeHint:"შეეხეთ დასახურად",addPhoto:"ფოტოს დამატება",addPhotoHint:"შეეხეთ ახალი ფოტოს ასატვირთად",viewPhoto:"ფოტოს ნახვა",viewPhotoHint:"შეეხეთ ფოტოს დიდად სანახავად",deleteSigner:"მონაწილის წაშლა",deleteSignerHint:"ამ მონაწილის წაშლა",deleteMember:"წაშლა",deleteMemberHint:"მონაწილის წაშლა",addMember:"დამატება",addMemberHint:"ახალი მონაწილის დამატება",saveSignature:"შენახვა",saveSignatureHint:"ხელმოწერის შენახვა",clearSignature:"გასუფთავება",clearSignatureHint:"ხელმოწერის გასუფთავება",selectRole:"აირჩიეთ როლი",selectTemplate:"აირჩიეთ შაბლონი",backToInspection:"შემოწმების აქტი — დაბრუნება",backToInspectionHint:"გადავა შემოწმების აქტის ეკრანზე",retryLoading:"ხელახლა ცდა",cancelHint:"შეეხეთ გასაუქმებლად",newCertificate:"ახალი სერტიფიკატი",newCertificateHint:"სერტიფიკატის დამატება",closeSheet:"დახურვა",closeSheetHint:"ფორმის დახურვა",closePreview:"დახურვა",closePreviewHint:"პრევიუს დახურვა",help:"დახმარება",navigate:"გადასვლა",resumeDraft:"შევსების გაგრძელება"},le={searching:"ვეძებ მისამართს…",notFound:"მისამართი რუკაზე ვერ მოიძებნა"},de={unknown:"უცნობი შეცდომა",invalidEmailOrPassword:"არასწორი ელ-ფოსტა ან პაროლი",confirmEmailFirst:"გთხოვთ, დაადასტუროთ ელ-ფოსტა, შემდეგ სცადეთ შესვლა",passwordTooShort:"პაროლი უნდა შეიცავდეს მინიმუმ {{min}} სიმბოლოს",tooManyAttempts:"ძალიან ბევრი მცდელობა. მოიცადეთ და კვლავ სცადეთ",network:"ქსელის შეცდომა. შეამოწმეთ ინტერნეტ კავშირი",operationCancelled:"ოპერაცია გაუქმდა",notFound:"მონაცემი ვერ მოიძებნა",forbidden:"წვდომა აკრძალულია",alreadyExists:"უკვე არსებობს",requiredField:"სავალდებულო ველი",invalidPhoneFormat:"ფორმატი: +995 5XX XXX XXX ან 32X XXX XXX",deleteFailed:"წაშლა ვერ მოხერხდა",createFailed:"შექმნა ვერ მოხერხდა",saveFailed:"შენახვა ვერ მოხერხდა",uploadFailed:"ატვირთვა ვერ მოხერხდა",generationFailed:"გენერაცია ვერ მოხერხდა",syncFailed:"სინქრონიზაცია ვერ მოხერხდა",loadFailed:"ჩატვირთვა ვერ მოხერხდა",previewFailed:"პრევიუს ჩატვირთვა ვერ მოხერხდა",invalidAnswerFormat:"პასუხის ფორმატი არასწორია. გთხოვთ, შეასწოროთ.",needsInternetForPhoto:"ფოტოს ასატვირთად საჭიროა ინტერნეტი",cameraPermission:"კამერაზე წვდომა საჭიროა",galleryPermission:"გალერეაზე წვდომა საჭიროა",authRequired:"ავტორიზაცია საჭიროა",photoPermission:"ფოტოზე წვდომა არ არის",notFoundInspection:"შემოწმების აქტი ვერ მოიძებნა",notFoundTemplate:"შაბლონი არ არის",notFoundProject:"პროექტი ვერ მოიძებნა",missingQualification:"აკლია სერტიფიკატები",missingQualificationDesc:"მიუთითეთ: {{types}}",signatureRequired:"ხელმოწერა საჭიროა",signatureRequiredDesc:"PDF-ის დასაგენერირებლად საჭიროა ექსპერტის ხელმოწერა.",missingFields:"შეავსეთ: {{fields}}",pdfNotGeneratedYet:"ჯერ დააგენერირე PDF რეპორტი",inspectionNotSpecified:"შემოწმების აქტი არ არის მითითებული",dataStillLoading:"მონაცემები ჯერ იტვირთება",googleCalendarNotConnected:"ჯერ მიაერთეთ Google კალენდარი",googleSessionExpired:"Google სესია ამოიწურა — შეაერთე თავიდან",googleCalendarDisconnected:"Google კალენდარი გაითიშა",googleCalendarConnected:"Google კალენდარი შეერთდა",imageReadFailed:"სურათის წაკითხვა ვერ მოხერხდა",pdfFailed:"PDF ვერ შეიქმნა",navFailed:"ნავიგაცია ვერ მოხერხდა",photoSavingPending:"ფოტო ატვირთვა მიმდინარეობს. გთხოვთ მოიცადოთ და სცადოთ თავიდან",inspectionCreateFailed:"შემოწმების აქტი ვერ შეიქმნა",sessionLost:"სესია არ მუშაობს, ხელახლა გახსენით პროექტი"},ce={channelName:"შემოწმების აქტის შეხსენება",fallbackItemName:"შემოწმების აქტი",expiringTomorrowTitle:"ვადა გასდის ხვალ",addedToCalendar:"დაემატა: {{count}}",smsSent:"SMS გაიგზავნა",smsResent:"SMS ხელახლა გაიგზავნა",pdfDeleted:"PDF რეპორტი წაიშალა",requestDeleted:"მოთხოვნა წაიშალა",certificateUploaded:"სერტიფიკატი აიტვირთა",photoUploaded:"ფოტო აიტვირთა",photoDeleted:"ფოტო წაიშალა",signatureSaved:"ხელმოწერა შენახულია",projectCreated:"პროექტი შეიქმნა",undoLabel:"დაბრუნება",draftLoaded:"ჩატვირთულია ლოკალური ასლი — სინქრონიზაცია მოხდება ავტომატურად.",deleted:"წაიშალა",languageChanged:"ენა შეიცვალა",signedOut:"გასვლა შესრულდა",signOutFailed:"გასვლა ვერ მოხდა",photoSavedLocally:"ფოტო შენახულია — აიტვირთება ქსელის დაბრუნებისას",photoDeletedLocally:"ფოტო წაიშალა — სინქრონიზაცია მოხდება ქსელის დაბრუნებისას"},pe={home:"მთავარი",homeA11y:"მთავარი გვერდი",projects:"პროექტები",projectsA11y:"პროექტების სია",calendar:"კალენდარი",calendarA11y:"კალენდარი — განრიგი",regulations:"რეგულაციები",regulationsA11y:"რეგულაციები და სტანდარტები",more:"მეტი",moreA11y:"დამატებითი მენიუ",backToHome:"მთავარ გვერდზე",backToMore:"მეტი"},ue={brand:"Hubble",tagline:"შრომის უსაფრთხოების ექსპერტი",login:"შესვლა",register:"რეგისტრაცია",loginWithGoogle:"Google-ით შესვლა",registerWithGoogle:"Google-ით რეგისტრაცია",forgotPassword:"პაროლი დაგავიწყდა?",resetPassword:"პაროლის აღდგენა",resetSent:`პაროლის განახლების ბმული გაიგზავნა
{{email}}-ზე.`,resetInstructions:"შეიყვანეთ ელ-ფოსტა და გამოგიგზავნებთ პაროლის განახლების ბმულს.",sendLink:"გაგზავნა",enterValidEmail:"გთხოვთ შეიყვანოთ ვალიდური ელ-ფოსტა",passwordMinLength:"პაროლი (მინ. {{min}} სიმბოლო)",emailPlaceholder:"you@example.com",firstName:"სახელი",lastName:"გვარი",firstNamePlaceholder:"გიორგი",lastNamePlaceholder:"ხელაძე",emailAlreadyInUse:"ესეთი უზერი არსებობს უკვე",emailAlreadyInUseDesc:"ამ ელ-ფოსტით ანგარიში უკვე არსებობს. გსურთ შესვლა?",passwordWrong:"პაროლი არასწორია",accountNotFound:"ანგარიში ვერ მოიძებნა — შეამოწმეთ ელ-ფოსტა",tooManyAttemptsTitle:"ბევრჯერ ცადეთ?",tooManyAttemptsBody:"შესაძლოა პაროლი დაგავიწყდათ. გსურთ აღდგენა?",resetCta:"პაროლის აღდგენა",or:"ან",linkSent:"ბმული გაიგზავნა",linkSentBody:"შეამოწმეთ {{email}}. ბმულზე დაჭერით დაბრუნდებით აპლიკაციაში ახალი პაროლის შესაყვანად.",resetTitle:"პაროლის აღდგენა",resetSubtitle:"შეიყვანეთ ელ-ფოსტა და გამოგიგზავნით ბმულს პაროლის შესაცვლელად.",checkEmail:"შეამოწმეთ ელ-ფოსტა",verifyCodeSent:"დადასტურების ბმული გაიგზავნა {{email}}-ზე. დააჭირეთ ბმულს ელ-ფოსტაში, ან შეიყვანეთ კოდი ქვემოთ.",verifyConfirm:"დადასტურება",didntReceiveCode:"კოდი არ მიგიღიათ?",resend:"ხელახლა გაგზავნა",resendIn:"ხელახლა გაგზავნა ({{n}}წ)",codeSent:"კოდი გამოგზავნილია",codeExpired:"კოდის ვადა ამოიწურა. მოითხოვეთ ახალი.",invalidCode:"არასწორი კოდი. გთხოვთ, სცადოთ კიდევ ერთხელ.",confirmPasswordLabel:"გაიმეორეთ პაროლი",enterCodeN:"შეიყვანეთ {{n}}-ნიშნა კოდი",enterEmail:"შეიყვანეთ ელ. ფოსტა",invalidEmail:"ელ. ფოსტა არასწორია",newPasswordHint:"მინიმუმ 6 სიმბოლო",newPasswordLabel:"ახალი პაროლი",newPasswordTitle:"ახალი პაროლის შექმნა",passwordChanged:"პაროლი წარმატებით შეიცვალა",passwordMismatch:"პაროლები არ ემთხვევა",sessionExpired:"სესიის ვადა ამოიწურა, გაიარეთ ავტორიზაცია ხელახლა"},me={greetingNight:"მოგესალმებით",greetingMorning:"დილა მშვიდობისა",greetingAfternoon:"გამარჯობა",greetingEvening:"საღამო მშვიდობისა",resumeDraft:"გააგრძელეთ დრაფტი",newInspection:"ახალი შემოწმების აქტი",chooseProjectStart:"აირჩიეთ პროექტი და დაიწყეთ",uploadCertificates:"ატვირთეთ სერტიფიკატები",certExpiring:"{{count}} სერტიფიკატი იწურება",certExpiringSuffix:"სერტიფიკატი იწურება",pdfIncluded:"PDF რეპორტს ავტომატურად ერთვის.",checkDeadlines:"შეამოწმეთ ვადები, სანამ ობიექტი არ გაჩერდება.",sectionProjects:"პროექტები",allProjects:"ყველა",newProject:"ახალი პროექტი",createFirst:"შექმენით პირველი",recentActivity:"ბოლო აქტივობა",recentActs:"ბოლო აქტები",fetchError:"მონაცემები ვერ ჩაიტვირთა — შეამოწმეთ კავშირი და ჩამოათრიეთ განახლებისთვის",allActivity:"ყველა",startInspectionSheetTitle:"შემოწმების აქტის დაწყება",addNewProjectSheet:"ახალი პროექტის დამატება",noProjectsYet:"პროექტი ჯერ არ გაქვს",noProjectsHint:'შეეხეთ "ახალი პროექტის დამატება"',chooseTemplate:"აირჩიეთ შაბლონი",newProjectFormTitle:"ახალი პროექტი",projectNamePlaceholder:"მაგ. ვაკე-საბურთალოს ობიექტი",companyPlaceholder:"შემკვეთი",tipOfDay:"რჩევა დღისთვის",tip1:"ხარაჩოს ინსპექტირებამდე დარწმუნდით, რომ ქამარი და მუზარადი გაქვთ.",tip2:"ქარი 15 მ/წმ-ზე მეტი — შეაჩერეთ სიმაღლის სამუშაოები.",tip3:"ქამრის შემოწმების აქტი: შეამოწმეთ ნაკერები და ბალთები, არა მხოლოდ ზოლი.",tip4:"ფოტოები რეპორტს 3-ჯერ უფრო სანდოს ხდის — გადაიღეთ ყოველი ცვლილება.",tip5:"ხარაჩოს ფეხები უნდა იდგას მტკიცე, თანაბარ ზედაპირზე.",tip6:"ორი დამოუკიდებელი მიბმის წერტილი ყოველთვის უფრო უსაფრთხოა, ვიდრე ერთი.",tip7:"სველი ხარაჩო ორჯერ უფრო საშიშია — შეამოწმეთ ფიცრის ლპობა.",relNow:"ახლა",relMinAgo:"{{n}} წთ. წინ",relHourAgo:"{{n}} სთ. წინ",relDayAgo:"{{n}} დღის წინ",quickInspection:"შემოწმება",quickIncident:"ინციდენტი",quickBriefing:"ინსტრუქტაჟი",quickReport:"რეპორტი",newLabel:"ახალი",stepLabel:"ნაბიჯი {{step}}",lastDraft:"ბოლო დრაფტი",resumeDraftHint:"შეეხეთ დრაფტის გასაგრძელებლად",qualificationsLabel:"კვალიფიკაციები",qualificationsHint:"შეეხეთ კვალიფიკაციების სანახავად",createProjectLabel:"პროექტის შექმნა",createProjectHint:"შეეხეთ ახალი პროექტის შესაქმნელად",newProjectLabel:"ახალი პროექტის შექმნა"},ge={title:"პროექტები",yourProjects:"შენი პროექტები",subtitle:"აქ ჩანს თქვენი ყველა მიმდინარე პროექტი",tapForDetails:"შეეხეთ პროექტს დეტალების სანახავად",addProject:"ახალი პროექტი",addProjectSubtitle:"დაამატე სამშენებლო ობიექტი შემოწმების დასაწყებად",yourProfile:"შენი პროფილი",profileSubtitle:"აქ არის შენი ხელმოწერა და პარამეტრები",noProjects:"ჯერ პროექტი არ არის",noProjectsHint:"შექმენით პირველი პროექტი და დაიწყეთ შემოწმების აქტები",createProject:"+ ახალი პროექტი",changePhoto:"სურათის შეცვლა",createButton:"შექმნა",clientPlaceholder:"შემკვეთი",projectNamePlaceholder:"მაგ. ვაკე-საბურთალოს ობიექტი",nameLabel:"სახელი",companyLabel:"კომპანია",addressLabel:"მისამართი",deleteConfirm:"{{name}} — ყველა შემოწმების აქტსთან ერთად წაიშლება. გავაგრძელოთ?",draft:"დრაფტი",completed:"დასრულდა",tourProjectInfo:"პროექტის ბარათი",tourProjectInfoBody:"დასახელება, მისამართი, ლოგო და მდებარეობა. შესაცვლელად დააჭირეთ ფანქრის ღილაკს ზედა მარჯვნივ.",tourActions:"სწრაფი ქმედებები",tourActionsBody:"ერთი შეხებით დაიწყეთ შემოწმება, დაარეგისტრირეთ ინციდენტი, ჩაატარეთ ინსტრუქტაჟი, შექმენით რეპორტი ან დაამატეთ ფაილი.",tourCrew:"გუნდი",tourCrewBody:"დაამატეთ ექსპერტი და მუშები — ისინი ავტომატურად აისახებიან შემოწმების აქტებში.",tourFiles:"ბრძანებები",tourFilesBody:"აქ იქმნება ბრძანებები და ინახება ფაილები",tourHistory:"ჩანაწერების ისტორია",tourHistoryBody:"ყველა შემოწმება, ინციდენტი, ინსტრუქტაჟი და დოკუმენტი ინახება სექციებად ქვემოთ.",tourNewInspection:"ახალი შემოწმების აქტი",tourNewInspectionBody:"დააჭირეთ და დაიწყეთ ახალი შემოწმების აქტი",inspectorFallback:"ექსპერტი",memberSaveError:"მონაწილე ვერ შეინახა",templateMissing:"შაბლონი არ არის",chooseTemplateTitle:"აირჩიეთ შაბლონი",cancelOption:"გაუქმება",noCompletedInspections:"ჯერ არ არის დასრულებული",logoUpdated:"ლოგო განახლდა",logoSaveFailed:"ლოგო ვერ შეინახა",logoRemove:"ლოგოს წაშლა",galleryAccessDenied:"გალერეაზე წვდომა აკრძალულია",uploaded:"აიტვირთა",fileOpenFailed:"ფაილი ვერ გაიხსნა",saved:"შენახულია",draftsSection:"დრაფტები",completedSection:"დასრულებული",questionnairesSection:"შემოწმების აქტები",participantsSection:"მონაწილეები",edit:"რედაქტირება",contactPhone:"საკონტაქტო ტელეფონი",chooseLocation:"მდებარეობის არჩევა",chooseOnMap:"აირჩიეთ მდებარეობა რუკაზე",noLocation:"ლოკაციის გარეშე",unmappedCount:"{{count}} პროექტს ლოკაცია არ აქვს",overdueCount:"⚠ {{count}} ვადაგადაცილებული",draftsCountBadge:"✎ {{count}} დრაფტი",completedCountBadge:"✓ {{count}} დასრულებული",noInspections:"შემოწმება არ არის",openButton:"გახსნა →",deleteConfirmYes:"დიახ, წაშლა",fabA11yLabel:"ახალი პროექტი",fabA11yHint:"შეეხეთ ახალი პროექტის შესაქმნელად",mapPickError:"აირჩიეთ მდებარეობა რუკაზე",unmappedSheetSubtitle:"ამ პროექტებს კოორდინატები არ აქვთ",changePhotoHint:"შეეხეთ ლოგოს ასარჩევად",closeBackdrop:"შეეხეთ ფონის დასახურად",openProject:"გახსნა →",backA11yHint:"შეხება — უკანა ეკრანზე დაბრუნება",editA11yHint:"შეხება — პროექტის რედაქტირება",mapA11yLabel:"პროექტის მდებარეობა რუკაზე",mapA11yHint:"შეხება — რუკის სრული ეკრანი",callA11yLabel:"დარეკვა",editLogoA11yLabel:"ლოგოს შეცვლა",editLogoA11yHint:"შეხება — პროექტის ლოგოს შეცვლა",uploadSheetTitle:"ფაილის ატვირთვა",uploadOptionPhoto:"ფოტო",uploadOptionFile:"ფაილი",uploadSuccess:"ატვირთულია ({{count}})",uploadPartial:"ატვირთულია {{success}}, ვერ ატვირთა {{failed}}",addInspection:"+ დამატება",addIncident:"+ დამატება",addBriefing:"+ დამატება",addReport:"+ დამატება",addOrder:"+ ბრძანება",addBreathalyzer:"+ ჟურნალი",quickActionInspection:"შემოწმება",quickActionIncident:"ინციდენტი",quickActionBriefing:"ინსტრუქტაჟი",quickActionReport:"რეპორტი",filesAndOrdersTitle:"ბრძანებები და ფაილები",reportsSectionTitle:"რეპორტები",briefingsSectionTitle:"ინსტრუქტაჟი",incidentsSectionTitle:"ინციდენტები",logsTitle:"ჟურნალები",createOrderA11yLabel:"ახალი ბრძანება",createOrderA11yHint:"შეხება — ახალი ბრძანების შექმნა",deleteFileA11yLabel:"ფაილის წაშლა",openFileA11yHint:"შეხება — ფაილის გახსნა",deleteInspectionA11yLabel:"შემოწმების წაშლა",viewInspectionA11yHint:"შეხება — შემოწმების გახსნა",newReportA11yLabel:"ახალი რეპორტი",newReportA11yHint:"შეხება — ახალი რეპორტის შექმნა",breathalyzerA11yLabel:"ალკოტესტი",breathalyzerA11yHint:"შეხება — ალკოტესტის ჟურნალის გახსნა",breathalyzerEmptySubtitle:"ჯერ ჟურნალი არ არის",breathalyzerPersonsTested:"{{count}} პირი · ",breathalyzerStatusClosed:" · დასრულებული",breathalyzerStatusOngoing:" · მიმდინარე",breathalyzerRowA11yLabel:"ალკოტესტის ჩანაწერი",breathalyzerRowA11yHint:"შეხება — ჩანაწერის გახსნა",mapModalTitle:"პროექტები რუკაზე",mapCloseA11yHint:"შეხება — რუკის დახურვა",mapMarkerLimitNotice:"ნაჩვენებია 20 პროექტი",viewAllHint:"სრული სიის გახსნა",incidentViewA11yHint:"შეეხეთ ინციდენტის სანახავად",cardA11yLabel:"პროექტი: {{name}}",cardA11yHint:"შეეხეთ პროექტის დეტალების სანახავად",avatarChangeLogoA11y:"ლოგოს შეცვლა",avatarAddLogoA11y:"ლოგოს დამატება",avatarEditHint:"შეეხეთ პროექტის ლოგოს ასარჩევად",noRecords:"ჩანაწერები არ არის",participantCountSuffix:" მონაწილე · "},fe={newTitle:"ახალი მონაწილე",editTitle:"მონაწილის რედაქტირება",fullNamePlaceholder:"გიორგი ხელაძე",phonePlaceholder:"+995 5XX XX XX XX",positionPlaceholder:"მაგ. ზედამხედველი",noSignature:"ხელმოწერა შენახული არ არის",drawSignature:"ხელმოწერის დახატვა",redrawSignature:"ხელახლა დახატვა",signatureField:"ხელმოწერა",addButton:"დამატება",saveButton:"შენახვა",clearButton:"გასუფთავება",added:"დაემატა",updated:"განახლდა"},he=JSON.parse('{"title":"შემოწმების აქტი","pdfItemHeader":"შემოწმების პუნქტი","pdfResultHeader":"შედეგი","pdfPhotoAlt":"ფოტო","pdfNotesLabel":"შენიშვნები / ხარვეზები","pdfPhotosLabel":"ფოტოები","pdfSignatureAlt":"ხელმოწერა","pdfInternalBadge":"შიდა სამსახურებრივი დოკუმენტი","chooseTemplate":"აირჩიეთ შაბლონი","chooseTemplateSubtitle":"რომელი ობიექტის შემოწმება გსურთ?","backTitle":"მთავარი","notFoundTitle":"შემოწმების აქტი ვერ მოიძებნა","notFoundDesc":"შესაძლოა წაიშალა, ან თქვენ არ გაქვთ წვდომა.","statusSafe":"✓ უსაფრთხოა","statusProblems":"⚠ გამოვლენილია პრობლემები","problemsSection":"გამოვლენილი პრობლემები","checked":"შემოწმდა","problem":"პრობლემა","skipped":"გამოტოვდა","participants":"მონაწილეები","signed":"ხელი მოწერილი","notPresent":"არ ესწრებოდა","pdfGenerateAndSend":"PDF გენერირება და გაგზავნა","pdfPreview":"PDF პრევიუ","pdfReportsCount":"PDF რეპორტები ({{count}})","previewModalTitle":"PDF პრევიუ","previewLoading":"პრევიუ იტვირთება…","safe":"უსაფრთხოა","caution":"დასაშვებია, საჭიროებს დაკვირვებას","notSafe":"დაუშვებელია გამოყენება","remoteNotSent":"არ გაგზავნილა","remoteSent":"გაგზავნილია","remoteSigned":"ხელმოწერილი","remoteDeclined":"უარი თქვა","remoteExpired":"ვადაგასული","sendSms":"SMS-ის გაგზავნა","resendSms":"ხელახლა გაგზავნა","cancelRemote":"გაუქმება","wizardStepConclusion":"დასკვნა","wizardStepHarnessCount":"ქამარების რაოდენობა","wizardStepHarnessCheck":"ქამარების შემოწმება","wizardStepComponent":"კომპონენტი • {{row}}","wizardStepCheck":"შემოწმება","wizardStepMeasure":"გაზომვა","wizardStepNote":"შენიშვნა","wizardStepPhoto":"ფოტო","loadError":"არ მოიძებნა","answerFormatError":"პასუხის ფორმატი არასწორია. გთხოვთ, შეასწოროთ.","loadErrorWithDetail":"ჩატვირთვა ვერ მოხერხდა: {{detail}}","photoUploading":"ფოტოები იტვირთება ({{count}})…","photoUploadingSingle":"ფოტო იტვირთება…","footerComplete":"დასრულება","footerNextAnswered":"შემდეგი","footerNextUnanswered":"გამოტოვება","deleteTitle":"წაშლა?","deleteBody":"შემოწმების აქტი სამუდამოდ წაიშლება.","deleteCancel":"გაუქმება","deleteConfirm":"წაშლა","photoLabel":"ფოტო","noteLabel":"შენიშვნა","textPlaceholder":"შეავსეთ აქ...","missingSafetyStatus":"უსაფრთხოების სტატუსი","missingConclusion":"დასკვნა","missingHarnessName":"ქამრის დასახელება","completeError":"შემოწმების აქტის დასრულება ვერ მოხერხდა: {{detail}}","exitTitle":"გასვლა?","exitBody":"გასვლისას პასუხები შეინახება, მაგრამ შემოწმების აქტი არ დასრულდება.","exitStay":"გაგრძელება","exitLeave":"გასვლა","commentPlaceholder":"კომენტარი","additionalCommentPlaceholder":"დამატებითი კომენტარი (არასავალდებულო)","harnessModelPlaceholder":"მაგ. Petzl NEWTON","describeDetailedPlaceholder":"აღწერეთ დეტალურად...","viewPreview":"პრევიუს ნახვა","viewInspection":"შემოწმების აქტის ნახვა","backToHome":"მთავარ გვერდზე","deletePhotoTitle":"ფოტოს წაშლა","deletePhotoBody":"დარწმუნებული ხართ, რომ გსურთ ამ ფოტოს წაშლა?","requiredFields":"შეავსეთ სავალდებულო ველები","newModalTitle":"ახალი შემოწმების აქტი","templateLabel":"შაბლონი","chooseProject":"აირჩიეთ პროექტი","createNow":"შექმნი ახლავე","noProjectsYet2":"ჯერ არცერთი პროექტი არ გაქვს.\\nდაიწყე ახლის შექმნით.","startButton":"დაიწყე შემოწმების აქტი","chooseProjectRequired":"აირჩიეთ პროექტი","completeSuccess":"შემოწმება დასრულდა","answerSaveFailed":"პასუხი ვერ შეინახა: {{detail}}","photoUploadFailed":"ფოტო ვერ აიტვირთა: {{detail}}","photoDeleteFailed":"ფოტო ვერ წაიშალა: {{detail}}","loadTimeout":"შემოწმების მონაცემების ჩატვირთვა ძალიან დიდხანს გრძელდება. სცადეთ თავიდან ან გადადით უკან.","retryLoad":"თავიდან ცდა","photoBarLabel":"ფოტო","addPhotoHintUpload":"შეეხეთ ფოტოს ასატვირთად","deletePhotoA11y":"ფოტოს წაშლა","noteBarLabel":"შენიშვნა","addNoteA11y":"შენიშვნის დამატება","addNoteHint":"შეეხეთ შენიშვნის დასამატებლად","generalPhotosLabel":"ზოგადი ფოტოები","verdictCautionShort":"დასაშვებია","verdictUnsafeShort":"დაუშვებელია","harnessStatusGood":"ვარგისია","harnessStatusDamaged":"დაზიანებულია","harnessCountQuestion":"ქამრების რაოდენობა:","decreaseHarnessCount":"ქამრების რაოდენობის შემცირება","decreaseHarnessCountHint":"ერთით შემცირება","increaseHarnessCount":"ქამრების რაოდენობის გაზრდა","increaseHarnessCountHint":"ერთით გაზრდა","harnessStatusGoodHint":"ვარგისია — შეეხეთ ასარჩევად","harnessStatusDamagedHint":"დაზიანებულია — შეეხეთ ასარჩევად","questionnaireFallbackTitle":"შემოწმების აქტი","emptyTemplateTitle":"შაბლონი ცარიელია","emptyTemplateMessage":"ამ შაბლონს კითხვები არ აქვს.","measureRange":"დასაშვები დიაპაზონი:","closePhotoBackdropHint":"შეეხეთ ფოტოს დასახურად","photoLoadFailed":"ფოტო ვერ ჩაიტვირთა","retryPhotoLoad":"ხელახლა ცდა","retryPhotoLoadHint":"შეეხეთ ფოტოს ხელახლა ჩასატვირთად","deleteA11yHint":"ფოტოს წაშლა","refreshPhoto":"ხელახლა ცდა","addPhotosBelow":"ქვემოთ დაამატეთ ფოტოები.","statusA11yPrefix":"სტატუსი: ","statusSelectHint":"შეეხეთ სტატუსის ასარჩევად","doneButton":"დასრულება","checklistGood":"ვარგისია","checklistDeficient":"ხარვეზი","checklistUnusable":"გამოუსადეგარია","saveAndFinish":"შენახვა და დასრულება","photoLabelOptional":"ფოტოები (სურვ.)","harnessNameLabel":"ქამრის დასახელება","completing":"მუშავდება…","verdictTitle":"გადაწყვეტილება","verdictRequired":"აირჩიეთ გადაწყვეტილება","suggestionApplyHint":"შეეხეთ შემოთავაზების გამოსაყენებლად","otherSpecificName":"კონკ. სახელი","addPhotoFromCamera":"ფოტოს გადაღება ან ბიბლიოთეკიდან","addPhotoShort":"+ ფოტო","qualDocLabel":"კვალიფიკაციის დოკუმენტი","addDocPhoto":"დოკუმენტის ფოტოს დამატება","takePhoto":"ფოტოს გადაღება","slingTypeSheetTitle":"სლინგის/ჯაჭვის ტიპი","scaffoldHelpComponentImage":"კომპონენტის სურათი","scaffoldHelpComponentImageBody":"ეს გვიჩვენებს სად ზუსტად არის ეს ნაწილი","scaffoldTourGuideLabel":"გზამკვლევი","scaffoldTourTitle":"ხარაჩოს კომპონენტები","scaffoldTourSubtitle":"გაიცანით კომპონენტები შემოწმებამდე — არასავალდებულოა, შეგიძლიათ გამოტოვოთ.","scaffoldTourStartInspection":"შემოწმების დაწყება","scaffoldTourNextPage":"შემდეგი · {{index}}/{{total}}","editFailed":"რედაქტირება ვერ მოხერხდა","pdfGenerateTooLong":"PDF გენერაცია ძალიან დიდხანს გრძელდება. სცადეთ თავიდან.","pdfGenerateFailed":"PDF ვერ შეიქმნა","certificatesButton":"სერტიფიკატები","signaturesButton":"ხელმოწერები","shareButton":"გაზიარება / PDF","shareButtonLocked":"PDF (ლიმიტი)","verdictSafeForUse":"უსაფრთხოა გამოსაყენებლად","verdictNotSafeForUse":"არ არის უსაფრთხო","bobcatTitle":"ბობკეტი","largeBobcatTitle":"მსხვილი დამტვირთველი","equipmentModelLabel":"ტექნიკის მარკა / მოდელი","registrationNumberLabel":"სახელმწიფო ნომერი","photosOptional":"ფოტოები (სურვ.)","verdictPositive":"დადებითი","verdictLimited":"შეზღუდული","verdictNegative":"უარყოფითი","bobcatDoneType":"ბობკეტი / დამტვირთველი","cargoPlatformDoneType":"ტვირთის მიმღები პლატფორმა","verdictConditional":"პირობითი","excavatorDoneType":"ექსკავატორი","geDoneType":"ტექ. აღჭურვილობა","cpLoadingTitle":"პლატფორმის შემოწმება","cpTemplateNameResult":"ტვირთის მიმღები პლატფორმა","cpMissingComment":"კომენტარი","cpGuardrailNone":"არ გააჩნია","cpGuardrailComplete":"მოაჯირი სრულია","cpGuardrailNonStandard":"ვერ აკმაყოფილებს სტანდარტს","cpGuardrailStandard":"სტანდარტს აკმაყოფილებს","cpFloorZoneLabel":"სართული / ზონა","cpPlatformTypeModelLabel":"პლატფორმის ტიპი / მოდელი","cpLengthLabel":"სიგრძე (მ)","cpWidthLabel":"სიგანე (მ)","cpColorDescLabel":"ვიზუალური აღწერა / ფერი","cpSideGuardrailLabel":"გვერდის დამცავი მოაჯირი","cpFrontGuardrailLabel":"წინა დამცავი მოაჯირი","cpGuardrailHeightLabel":"მოაჯირის სიმაღლე (სტანდ. 90-120 სმ)","cpCargoHint":"ყველა ტვირთი, რომელიც განთავსდება პლატფორმაზე, ექვემდებარება იდენტიფიკაციას","cpCargoNameCol":"ტვირთის დასახელება","cpCargoWeightCol":"სრული წონა (კგ)","cpCargoTotal":"სულ:","cpPhotoVideoLabel":"ფოტო / ვიდეო მასალა (სურვ.)","excavatorLoadingTitle":"ექსკავატორი","excavatorCloseBtn":"დახურვა","excavatorPhotosLabel":"ფოტოები (სურვ.)","excavatorAddPhotoA11y":"ფოტოს დამატება","excavatorDeletePhotoA11y":"ფოტოს წაშლა","fpLoadingTitle":"დამცავი მოწყობილობა","fpTemplateNameResult":"დამცავი მოწყობილობა","fpSafetyLeaderNameLabel":"უსაფრთხოების ხელმძღვანელის სახელი","fpSafetyLeaderPhoneLabel":"უსაფრთხოების ხელმძღვანელის ტელეფონი","fpInspectionTypeLabel":"შემოწმების სახე","fpInspectionTypePrimary":"პირველადი","fpInspectionTypeSecondary":"განმეორებითი","fpDeviceListTitle":"მოწყობილობების სია","fpOtherLabel":"სხვა","fpOtherPlaceholder":"სხვა (სახელი)...","fpDevicePhotoLabel":"{{deviceId}} მოწყობილობის ფოტო (სურვ.)","fpLegendSafe":"უსაფრთხოა","fpLegendMinor":"მცირე დაზიანება","fpLegendCritical":"კრიტიკული","forkliftLoadingTitle":"ჩანგლიანი დამტვირთველი","forkliftTemplateNameResult":"ჩანგლიანი დამტვირთველი","forkliftInventoryLabel":"ინვენტ. / სერიული ნომერი *","forkliftBrandModelLabel":"მარკა / მოდელი *","forkliftEngineTypeLabel":"ძრავის ტიპი","forkliftComponentsTitle":"კომპონენტები (ა-კ)","forkliftSummaryTitle":"შეჯამება","forkliftPhotosTitle":"ფოტოები","forkliftMissingBrandModel":"მარკა / მოდელი","forkliftMissingInventory":"ინვენტ. / სერიული ნომერი","geLoadingTitle":"ტექ. აღჭურვ.","geTemplateNameResult":"ტექ. აღჭურვილობა","geEquipmentNamePlaceholder":"დასახელება...","geAddEquipmentButton":"აღჭურვილობის დამატება","geMinOneRowHint":"შეავსეთ მინიმუმ ერთი აღჭურვილობის სტრიქონი","gePhotosLabel":"ფოტოები (სურვ.)","geMissingObjectName":"ობიექტის დასახელება","geMissingEquipmentRow":"მინიმუმ 1 აღჭ. სტრ.","geMissingEquipmentNote":"შენიშვნა საჭიროა {{count}} აღჭურვილობაზე","geGoodLabel":"ვარგისია","geDeficientLabel":"ხარვეზი","geUnusableLabel":"გამოუსადეგარია","geInspectionTypeLabel":"შემოწმების სახე","harnessLoadingTitle":"დამცავი ქამრები","harnessTemplateNameCompleted":"დამცავი ქამრების შემოწმება","harnessNameHint":"მიუთითეთ ღვედის სერიული ნომერი, პარტია ან სხვა იდენტიფიკატორი.","harnessNameFieldLabel":"ღვედის სახელი / N *","harnessSafeLabel":"უსაფრთხოა","harnessUnsafeLabel":"არ არის უსაფრთხო","harnessMissingName":"შეავსეთ ღვედის დასახელება","harnessMissingVerdict":"შეავსეთ: დასკვნა","harnessMissingComment":"შეავსეთ: კომენტარი","harnessPhotoSaved":"ფოტო შენახულია - აიტვირთება ქსელის დაბრუნებისას","harnessPhotoUploaded":"ფოტო აიტვირთა","harnessPhotoDeleted":"ფოტო წაიშალა","harnessUploadingMany":"ფოტოები იტვირთება ({{count}})...","harnessUploadingSingle":"ფოტო იტვირთება...","harnessCompleteError":"შეცდომა: {{detail}}","harnessPatchAnswerError":"პასუხი ვერ შეინახა: {{detail}}","harnessPhotoUploadError":"ფოტო ვერ აიტვირთა: {{detail}}","harnessPhotoDeleteError":"ფოტო ვერ წაიშალა: {{detail}}","laLoadingTitle":"სტროპები და ჩამჭერები","laTemplateNameResult":"სტროპები და ჩამჭერები","laVisualSectionTitle":"A - ვიზუალური შემოწმება","laFunctionalSectionTitle":"B - ფუნქციური შემოწმება","laRemovedSectionTitle":"ამოღებული მოწყობილობები","laRemovedSerialCol":"სერ. № / ID","laRemovedTypeCol":"ტიპი / სახელ.","laRemovedReasonCol":"ამოღების მიზეზი","laPhotosTitle":"ფოტოები","mlLoadingTitle":"კიბის შემოწმება","mlTemplateNameResult":"მობილური კიბე","mlLadderTypeLabel":"სახეობა / ტიპი","mlModelLabel":"მწარმოებელი / მოდელი","mlHeightLabel":"სიმაღლე (მ)","mlMaxLoadLabel":"მაქს. დატვირთვა (კგ)","mlVisualSectionTitle":"A - სტრუქტურული მდგომარეობა","mlMobileSectionTitle":"B - მობილური სისტემა","snLoadingTitle":"ბადის შემოწმება","snDocTitle":"უსაფრთხოების ბადის შემოწმების აქტი","snTemplateNameResult":"უსაფრთხოების ბადე","snLoadInstruction":"180კგ-ის სიმძიმე 1მ სიმაღლიდან - №477 დადგენილება","snTotalLabel":"სულ:","snPostTestTitle":"ტვირთის ჩაგდების შემდეგ შემოწმება","snVisualSectionTitle":"ვიზუალური შემოწმება","snPhotosLabel":"ფოტო / ვიდეო მასალა (სურვ.)","snManufacturerLabel":"დასახელება","snNetSizeLabel":"ბადის ზომა (მ×მ)","snCellSideLabel":"ბადის უჯრედის გვერდების სიგრძე","snWorkingDistanceLabel":"ბადის დგარებს შორის მანძილი","snCertLabel":"ბადის სერთიფიკატი","snCertNone":"არ აქვს","snCertActive":"მოქმედია","snCertExpired":"ვადა ამოწურულია","snPostSizeLabel":"დგარების ზომა","snPostCountLabel":"დგარების რაოდენობა","snPostAnchorCountLabel":"დგარის სამაგრი ფეხის რაოდენობა","snAnchorPointCountLabel":"ბადის დგარების ანკერის / ჭანჭიკის წერტილების რაოდენობა","snEdgeRopeCountLabel":"ბადის კიდეზე არსებული ბაგირის რაოდენობა","snCargoNameCol":"ტვირთის აღწერა","snLegendGood":"კარგი","snLegendFix":"გამოსასწორებელი","snLegendNa":"არ გააჩნია ან არ ეკუთვნის","snVerdictPass":"ტესტირება წარმატებულია","snVerdictFail":"ტესტირება წარუმატებელია","snVisualItem1Label":"ბადის ქსოვილის მდგომარეობა","snVisualItem1Desc":"ჭრა, გახეთქვა, წყვეტა","snVisualItem2Label":"ბადის უჯრედი - მაქს. 15სმ","snVisualItem3Label":"ბადის კვანძების მდგრადობა","snVisualItem3Desc":"გახსნა, კოროზია, დაზიანება","snVisualItem4Label":"ბადი სამაგრი კიდეები","snVisualItem4Desc":"კონსტრუქციისგან დაშორება","snVisualItem5Label":"სამაგრი ბაგირების მდგომარეობა","snVisualItem5Desc":"გახსნა, კოროზია, გაჭრა","snVisualItem6Label":"კიდის ბაგირის მდგომარეობა","snVisualItem6Desc":"გჭრილი, წყვეტილი","snVisualItem7Label":"დგარების ვიზუალური მდგ.","snVisualItem7Desc":"ბზარი, დაღუნული, კოროზია","snVisualItem8Label":"დგარის სამაგრი ფეხი","snVisualItem8Desc":"დაღუნული, ბზარი","snVisualItem9Label":"სამაგრი ჭანჭიკები / ანკერები","snVisualItem9Desc":"კოროზია, გაცვეთა, გახსნა","snVisualItem10Label":"დგარის სტაბილიზატორი","snVisualItem10Desc":"მოშვებული, მოხსნილი, დაზიანება","snPostItem1Label":"დგარის სამაგრი ფეხის მდგომარეობა","snPostItem2Label":"დგარების მდგომარეობა","snPostItem3Label":"სამაგრი ჭანჭიკის/ანკერის მდგ.","snPostItem4Label":"ბადის ვიზუალური მდგომარეობა","snPostItem5Label":"სამაგრი ბაგირების მდგომარეობა","snResultGood":"კარგი","snResultFix":"გამოსასწ.","snResultNa":"N/A","snResultPass":"გამოც.","snResultFail":"პრობლ.","snUnitWeightCol":"ერთ.წ.(კგ)","snQuantityCol":"რ-ბა","snTotalWeightCol":"სულ(კგ)","snCommentCol":"კომ.","newInspectionGenericTitle":"შემოწმება","newProjectButton":"ახალი პროექტი","newProjectCreatingError":"ვერ შეიქმნა"}'),be={title:"PDF რეპორტები",emptyTitle:"PDF რეპორტი ჯერ არ გაქვთ",emptyHint:"დაასრულეთ შემოწმების აქტი და დააგენერირეთ პირველი PDF რეპორტი",emptyAction:"ახალი შემოწმების აქტი",pdfReport:"PDF რეპორტი",deleted:"წაიშალა",deleteError:"ვერ წაიშალა",newTitle:"PDF რეპორტის გენერაცია",qualificationMissingTitle:"სერტიფიკატები არ არის",qualificationMissingDesc:"ატვირთეთ სერტიფიკატი ან ახლავე ატვირთეთ ახალი.",uploadAction:"ატვირთვა",noOtherQualifications:"სხვა სერტიფიკატები არ არის",inspectionLabel:"შემოწმების აქტი",chiefEngineer:"მთავარი ინჟინერი",safetySpecialist:"შრომის უსაფრთხოების სპეციალისტი",drawAction:"დახატვა",changeAction:"შეცვლა",signaturePlaceholder:"ხელმოწერა",otherSigners:"სხვა ხელმომწერები",signerSignatureOf:"{{name}}-ის ხელმოწერა",signatureRequired:"ხელმოწერა საჭიროა",addSignerOptional:"სურვილის შემთხვევაში — დაამატეთ სხვა ხელმომწერი",signerNamePlaceholder:"სახელი გვარი",enterNameFirst:"ჯერ შეიყვანეთ სახელი",newSigner:"ახალი ხელმომწერი",qualificationCerts:"სერტიფიკატები",notSelected:"არ არის არჩეული",uploaded:"ატვირთულია",certNumber:"№ {{number}}",changeCert:"შეცვლა",selectCert:"არჩევა",selectAllRequired:"არჩიე ყველა საჭირო სერტიფიკატი",additionalCerts:"დამატებითი სერტიფიკატები",addOtherQualifications:"სურვილის შემთხვევაში — დაამატეთ სხვა სერტიფიკატი",addButton:"+ დამატება",previewButton:"პრევიუ",generateButton:"PDF-ის გენერაცია",generateSuccess:"PDF რეპორტი შეიქმნა",assetsMissing:"{{count}} სურათი ვერ ჩაიდო — გამოჩნდება ჩანაცვლების ნიშნით.",previewFailedTitle:"პრევიუ ვერ აიწყო",sendSmsSuccess:"SMS გაიგზავნა",expertSignatureNeeded:'ექსპერტის ხელმოწერა საჭიროა — დაამატეთ "ჩემი ხელმოწერა" ეკრანიდან',addLogoTitle:"ლოგოს დამატება",addLogoBody:"პროექტს ჯერ არ აქვს ლოგო. გსურთ მისი დამატება PDF-ის გენერაციამდე?",addLogoAdd:"დამატება",logoSaveFailed:"ლოგო ვერ შეინახა",localCopyMissing:'ამ მოწყობილობაზე ლოკალური ასლი არ არის. დააჭირეთ "გაზიარება".',deletePdfHint:"PDF რეპორტის წაშლა",viewDetailsHint:"დეტალების ნახვა"},ye={title:"სერტიფიკატები",backTitle:"მეტი",requiredCerts:"სავალდებულო სერტიფიკატები",additionalCerts:"დამატებითი სერტიფიკატები",editTitle:"სერტიფიკატის რედაქტირება",newCertTitle:"ახალი სერტიფიკატი",typeRequired:"აირჩიე ან ჩაწერე სერტიფიკატის ტიპი",numberLabel:"ნომერი",deleteTitle:"წაიშალოს?",deleteBody:"სერტიფიკატის წაშლა შეუქცევადია",photoSelected:"✓ ფოტო არჩეულია — შეცვლა",changePhotoLabel:"ფოტოს შეცვლა",addCertPhoto:"სერტიფიკატის ფოტო",typeLabel:"ტიპი",issuedDate:"გაცემის თარიღი",expiryDate:"ვადის გასვლის თარიღი",expiryDateShort:"ვადის გასვლა",expiredLabel:"ვადა გასულია",expiringLabel:"იწურება",other:"სხვა",customCertRow:"სხვა ნებისმიერი სერტიფიკატი",uploadHint:"ატვირთვა",readyBtn:"მზადაა",yearPlus1:"+1 წელი",yearPlus3:"+3 წელი",yearPlus5:"+5 წელი",expiryQuickHint:"ვადის სწრაფად დამატება",certTypeInput:"სერტიფიკატის ტიპი",photoLabel16x9:"ფოტო (16:9)",photoUploadBtn:"ფოტოს ატვირთვა",selectTypeHint:"სერტიფიკატის ტიპის არჩევა",editHint:"სერტიფიკატის რედაქტირება",deleteHint:"სერტიფიკატის წაშლა"},ve={title:"ისტორია",backTitle:"მეტი",draftsSection:"დრაფტები",completedSection:"დასრულებული",deleteTitle:"წაშლა?",deleteBody:"შემოწმების აქტი სამუდამოდ წაიშლება.",deleted:"წაიშალა",deleteError:"ვერ წაიშალა",inspectionA11y:"შემოწმების აქტი",viewCompleted:"დასრულებული შემოწმების აქტის ნახვა",resumeDraft:"დრაფტის გაგრძელება",emptyTitle:"ისტორია ცარიელია",emptyHint:"დასრულებული შემოწმების აქტები გამოჩნდება აქ",startInspection:"შემოწმების აქტის დაწყება"},xe={inspections:"შემოწმების აქტები",reports:"რეპორტები",orders:"ბრძანებები",incidents:"ინციდენტები",briefings:"ინსტრუქტაჟი",viewAll:"ყველას ნახვა",emptyInspections:"შემოწმების აქტი ჯერ არ შექმნილა",emptyReports:"რეპორტი ჯერ არ შექმნილა",emptyOrders:"ბრძანება ჯერ არ შექმნილა",emptyIncidents:"ინციდენტი არ დაფიქსირებულა",emptyBriefings:"ინსტრუქტაჟი ჯერ არ ჩატარებულა",participantCount_one:"{{count}} მონაწილე",participantCount_other:"{{count}} მონაწილე",briefingA11y:"ინსტრუქტაჟი",viewDetailsA11y:"შეეხეთ დეტალების სანახავად",orderA11y:"ბრძანების ნახვა",reportViewA11y:"შეეხეთ რეპორტის სანახავად",reportViewDeleteA11y:"შეეხეთ სანახავად; გრძელი შეხებით — წაშლა",reportDeleteA11y:"რეპორტის წაშლა",viewAllReportsA11y:"ყველა რეპორტის ნახვა",slideCount_one:"{{count}} სლაიდი",slideCount_other:"{{count}} სლაიდი",deleteTitle:"წაშლა?",participantCount:"{{count}} მონაწილე",slideCount:"{{count}} სლაიდი"},Pe={title:"დრაფტები",empty:"დრაფტები არ არის"},Se={title:"მეტი",projectsCount:"პროექტი",completedCount:"დასრულდა",draftCount:"დრაფტი",history:"ისტორია",lastInspection:"ბოლო: {{date}}",emptyLast:"ცარიელია",drafts:"დრაფტები",draftsPending:"გასაგრძელებელი",draftsEmpty:"ცარიელია",qualifications:"სერტიფიკატები",expiringCount:"{{count}} იწურება",uploadPrompt:"დააჭირეთ ასატვირთად",allActive:"ყველა აქტიური",templates:"შაბლონები",system:"სისტემა",regulations:"რეგულაციები",document:"დოკუმენტი",mySignature:"ჩემი ხელმოწერა",drawSignature:"ხელმოწერის დახატვა",terms:"წესები და პირობები",signOut:"გასვლა",privacyPolicy:"კონფიდენციალურობის პოლიტიკა",privacyNoShare:"Hubble არ იზიარებს თქვენს პერსონალურ მონაცემებს მესამე მხარესთან.",privacyPhotos:"ფოტოები და ხელმოწერები ინახება მხოლოდ თქვენს პირად ანგარიშში",privacyPdf:"PDF რეპორტები ხელმისაწვდომია მხოლოდ თქვენთვის და თქვენი ორგანიზაციისთვის",privacyDelete:"მონაცემთა წაშლა შესაძლებელია აპლიკაციის პარამეტრებიდან",privacySupabase:"ყველა მონაცემი დაცულია Supabase-ის უსაფრთხო სერვერებზე",copyright:"© 2026 Hubble · ყველა უფლება დაცულია",settings:"პარამეტრები",darkMode:"მუქი რეჟიმი",language:"ენა / Language",pdfLanguage:"PDF ენა",changePassword:"პაროლის შეცვლა",signOutConfirmTitle:"გასვლა",signOutConfirmBody:"დარწმუნებული ხართ?",scaffold3dGuide:"ხარაჩო 3D გიდი",guide3dSafety:"3D Safety Guide / 3D უსაფრთხოების გიდი",cancelSubTitle:"გამოწერის გაუქმება?",cancelSubBodyUntil:"წვდომა გაგრძელდება {{until}}-მდე. ავტომატური განახლება არ მოხდება.",cancelSubBody:"გამოწერა გაუქმდება. ახალი გადახდა არ მოხდება.",sessionMissing:"სესია არ არის",cancelSubSuccessUntil:"წვდომა გაგრძელდება {{until}}-მდე",cancelSubSuccess:"გამოწერა გაუქმდა",paymentStatusPaid:"გადახდილია",paymentStatusPending:"მუშავდება",paymentStatusFailed:"წარუმატებელი",paymentStatusRefunded:"დაბრუნებულია",paymentHistory:"გადახდის ისტორია",planSection:"გეგმა",proActiveUntil:"მოქმედია: {{date}}-მდე",unlimitedPdf:"შეუზღუდავი PDF გენერაცია",cancelSub:"გამოწერის გაუქმება",proExpired:"გამოწერა ამოიწურა",pdfUsage:"PDF გამოყენება",freePlan:"უფასო გეგმა",pdfUsed:"PDF: {{count}}/{{limit}} გამოყენებული"},we={title:"კალენდარი",sync:"სინქრონიზაცია",filterExpired:"ვადაგასული",filterThisWeek:"ამ კვირას",filterThisMonth:"ამ თვეში",prevMonth:"წინა თვე",nextMonth:"შემდეგი თვე",noTemplate:"შაბლონი არ არის",noProject:"პროექტი ვერ მოიძებნა",chooseTemplate:"აირჩიეთ შაბლონი",createFailed:"შექმნა ვერ მოხერხდა",connectGoogleFirst:"ჯერ მიაერთეთ Google კალენდარი",addedCount:"დაემატა: {{count}}",syncFailed:"სინქრონიზაცია ვერ მოხერხდა",noInspections:"შემოწმების აქტი არ არის ამ დღეს.",today:"დღეს",start:"დაწყება",inspectionCount:"{{count}} შემოწმების აქტი",weekdayLabels:["ორშ","სამ","ოთხ","ხუთ","პარ","შაბ","კვ"],monthLabels:["იანვარი","თებერვალი","მარტი","აპრილი","მაისი","ივნისი","ივლისი","აგვისტო","სექტემბერი","ოქტომბერი","ნოემბერი","დეკემბერი"],monthLabelsShort:["იან","თებ","მარ","აპრ","მაი","ივნ","ივლ","აგვ","სექ","ოქტ","ნოე","დეკ"],filterAll:"ყველა",filterInspection:"შემოწმება",filterBriefing:"ინსტრუქტაჟი",filterOverdue:"ვადა გასული",filterUpcoming:"დაგეგმილი",filterProject:"პროექტი",allProjects:"ყველა პროექტი",goToSite:"დღეს ობიექტზე ვარ",emptyDay:"ამ დღეს მოვლენები არ არის",emptyFilter:"ფილტრი — მოვლენები ვერ მოიძება",allCaughtUp:"ყველა ვადა დაცულია",overdueDays:"{{count}} დღე გადაცილდა",inDays:"{{count}} დღეში",dueToday:"დღეს",jumpToToday:"დღეს",upcomingSection:"შეხსენება",noEvents:"მოვლენები არ არის",overdueSection:"ვადაგადაცილებული"},Le={title:"რეგულაციები",neverUpdated:"არასდროს",updatedToday:"დღეს, {{time}}",lastUpdate:"ბოლო განახლება: {{date}}",updatedBadge:"განახლდა",updatedDate:"განახლდა: {{date}}",openLinkA11y:"{{title}} — გახსნა",sourceLabel:"matsne.gov.ge",refresh:"განახლება",refreshHint:"რეგულაციების განახლება"},Te={confirmKa:"დადასტურება",confirmEn:"Confirm",declineWarning:"უარის თქმის შემთხვევაში აპლიკაციიდან გამოხვალ.",cancelKa:"გაუქმება",cancelEn:"Cancel",signOutKa:"გასვლა",signOutEn:"Sign out",langKa:"ქართული",langEn:"English",viewInBrowser:"ვერსიის ნახვა ბრაუზერში",agree:"ვეთანხმები",disagree:"არ ვეთანხმები"},ke={saved:"ხელმოწერა შენახულია",saveError:"შენახვა ვერ მოხერხდა",requiredTitle:"ხელმოწერა საჭიროა",requiredDesc:"PDF-ის დასაგენერირებლად საჭიროა ექსპერტის ხელმოწერა.",eyebrow:"ხელმოწერა",fallbackName:"ხელმომწერი",signHereHint:"ხელი მოაწერეთ ჩარჩოში",screenTitle:"ხელმოწერები",additionalLinesLabel:"დამატებითი ხელმომწერები",additionalLinesEmpty:"დამატებითი ხელმომწერი არ არის",addLine:"ხაზის დამატება",addLineA11y:"შეეხეთ ახალი ხელმოწერის ხაზის დასამატებლად",lineLabel:"ხაზი #{{index}}",lineRemoveA11y:"ხაზი #{{index}} — წაშლა",changeBtnA11y:"ხელმოწერის შეცვლა",tapToSign:"შეეხეთ ხელმოსაწერად",tapToSignA11y:"შეეხეთ ხელმოწერის დასაწყებად"},Fe={title:"ხელმოწერის გარე მოთხოვნა",description:"ხელის მოწერის ლინკი გაიგზავნება SMS-ით. ლინკი 14 დღეში იწურება.",roleLabel:"როლი",nameLabel:"სახელი გვარი",namePlaceholder:"გიორგი ხელაძე",phoneLabel:"ტელეფონი",phonePlaceholder:"+995 5XX XXX XXX",cancel:"გაუქმება",sendSms:"SMS-ის გაგზავნა"},Ae={rolePresets:["ზედამხედველი","ხარაჩოს ამწყობი"],addSheetTitle:"მონაწილის დამატება",nameLabel:"სახელი",namePlaceholder:"მაგ. გიორგი მელაძე",roleLabel:"როლი",saveButton:"შენახვა"},Ce={topics:{labor_safety_principles:"შრომის უსაფრთხოების ნორმები და პრინციპები",workplace_electrical:"სამუშაო სივრცისა და ელექტრო უსაფრთხოება",evacuation:"საგანგებო სიტუაციები და ევაკუაცია",risk_control:"საფრთხეები, რისკები და მათი კონტროლი",height_work:"სიმაღლეზე მუშაობის უსაფრთხოება",internal_regulations:"კომპანიის შინაგანაწესი",first_aid:"პირველადი სამედიცინო დახმარება",safety_signs:"უსაფრთხოების ნიშნები და მათი მნიშვნელობა",load_handling:"ტვირთის სწორი ჩაბმა და გადაადგილება",heavy_machinery:"მძიმე ტექნიკის უსაფრთხო ექსპლუატაცია",ergonomics:"ერგონომიკა და მიკროკლიმატი",monitor_radiation:"მონიტორის გამოსხივების უსაფრთხოება",housekeeping:"სამუშაო სივრცის დალაგება-დასუფთავება",technical_equipment:"ტექნიკური აღჭურვილობის უსაფრთხო ექსპლუატაცია",chemical_safety:"ქიმიური ნივთიერებების უსაფრთხოება",scaffold_safety:"ხარაჩოს უსაფრთხოება",ppe:"დამცავი აღჭურვილობა",fire_safety:"ხანძარსაწინააღმდეგო",other:"სხვა"},loadFailed:"ინსტრუქტაჟის ჩატვირთვა ვერ მოხერხდა",signatureSaveFailed:"ხელმოწერის შენახვა ვერ მოხერხდა",skipWorkerTitle:"ამ მუშაკის გამოტოვება?",skipWorkerBody:"შეგიძლიათ მოგვიანებით დაბრუნდეთ სიიდან.",skipAction:"გამოტოვება",skipFailed:"გამოტოვება ვერ მოხერხდა",topicNameLabel:"თემის დასახელება",participantNameLabel:"სახელი გვარი",startButton:"დაწყება →",createFailed:"ინსტრუქტაჟის შექმნა ვერ მოხერხდა",backToSkipped:"გამოტოვებულზე დაბრუნება",continueButton:"გააგრძელე →",skippedCountLabel:"{{count}} მუშაკი გამოტოვებული",completeAndPdf:"დასრულება და PDF გენერირება",dateTimeSection:"თარიღი და დრო",topicSection:"ინსტრუქტაჟის თემა",topicHint:"შეარჩიეთ ერთი ან მეტი",topicRequired:"აირჩიეთ მინიმუმ ერთი თემა",participantsSection:"მონაწილეები",participantRequired:"დაამატეთ მინიმუმ ერთი მონაწილე",participantHint:"მინიმუმ 1 მონაწილე საჭიროა",flowTitle:"ინსტრუქტაჟი",inspectorChipLabel:"ექსპერტი",inspectorChipHint:"ექსპერტის ხელმოწერა",signerChipHint:"ხელმომწერზე გადასვლა",inspectorEyebrow:"ექსპერტის ხელმოწერა",inspectorFallbackName:"ექსპერტი",inspectorSignPrompt:"გთხოვთ მოაწეროთ ხელი",workerEyebrow:"ხელს აწერს",alreadySigned:"უკვე მოწერილია - გადაწერა",signError:"გთხოვთ, ხელი მოაწეროთ",clearBtn:"გასუფთავება",clearBtnA11y:"ხელმოწერის გასუფთავება",savingLabel:"ინახება...",confirmButton:"დადასტურება →",skippedInterstitialBody:"შეგიძლიათ დაუბრუნდეთ მათ ან გააგრძელოთ ექსპერტის ხელმოწერაზე.",loadingLabel:"იტვირთება...",signHereHint:"ხელი მოაწერეთ ჩარჩოში",pdfGenerateFailed:"PDF-ის გენერაცია ვერ მოხერხდა"},De={tocTitle:"შინაარსი",tocQuestionCount:"{{count}} კითხვა",attachedCerts:"თანდართული სერტიფიკატები",certIssued:"გაცემა: {{date}}",certExpires:"ვადა: {{date}}",imageUnavailable:"სურათი მიუწვდომელია",statusNotSafe:"✗ დაუშვებელია გამოყენება",statusCaution:"⚠ დასაშვებია, საჭიროებს დაკვირვებას",statusSafe:"✓ უსაფრთხოა ექსპლუატაციისთვის",statusIncomplete:"● შეფასება დაუსრულებელია",watermarkDraft:"დრაფტი / DRAFT",previewBanner:"👁 PREVIEW — ეს არის PDF-ის პრევიუ. საბოლოო ვერსია შეიძლება განსხვავდებოდეს.",htmlTitle:"Hubble — {{templateName}}",systemName:"შრომის უსაფრთხოების ექსპერტული სისტემა",footerText:"Hubble · {{systemName}} · გვერდი ",metaDate:"თარიღი: {{date}}",metaObject:"ობიექტი: {{name}}",metaId:"ID: {{id}}",infoCompany:"კომპანია",infoObject:"ობიექტი",infoHarness:"ქამრის დასახელება",infoStatus:"სტატუსი",verdictLabel:"შეფასება",conclusionTitle:"დასკვნა",signaturesTitle:"ხელმოწერები",commentLabel:"კომენტარი",notesLabel:"შენიშვნა",photosTitle:"📷 ფოტო მასალა",yes:"კი",no:"არა",expertLabel:"ექსპერტი",timeLabel:"დრო",locationLabel:"ლოკაცია",deviceLabel:"მოწყობილობა",photoAlt:"ფოტო",signatureAlt:"ხელმოწერა"},He={subscriptionNotice:{title:"უფასო ლიმიტი ამოიწურა",body:"გამოწერის შეძენა აპლიკაციიდან შეუძლებელია.",usage:"PDF: {{used}} / {{limit}}"},pdfLockedBanner:{label:"PDF ლიმიტი ამოიწურა",details:"დეტალები"},statusBadgePass:"უსაფრთხოა",statusBadgeFail:"არ არის უსაფრთხო",statusBadgePending:"მოლოდინში",offlineBanner:"ხაზგარეშე — ცვლილებები ინახება ლოკალურად",offlineEmptyTitle:"ინტერნეტ კავშირი არ არის",offlineEmptyBody:"ეს მონაცემები ჯერ არ ჩამოტვირთულა. სცადეთ კავშირის აღდგენის შემდეგ.",savedOffline:"შენახულია ხაზგარეშე — აიტვირთება კავშირის აღდგენისას",pendingSyncTitle:"სინქრონიზაციის მოლოდინში",pendingSyncItem:"ელოდება სინქრონიზაციას",pendingSyncFailed:"ვერ აიტვირთა — სცადეთ თავიდან",pendingSyncRetry:"ხელახლა ცდა",pendingSyncDismiss:"მოცილება",errorStateTitle:"ვერ ჩაიტვირთა",errorStateRetry:"ხელახლა ცდა",errorBoundaryTitle:"მოხდა შეცდომა",errorBoundarySubtitle:"გთხოვთ, სცადოთ თავიდან",errorBoundaryRetry:"თავიდან ცდა",skeletonMapNoLocation:"ლოკაცია არ დაემატა",skeletonMapAddLocation:"ლოკაციის დამატება",namePlaceholder:"დასახელება",requiredField:"სავალდებულო ველი",phoneFormat:"ფორმატი: +995 5XX XXX XXX ან 32X XXX XXX",sendSms:"გაგზავნე SMS",remoteSignatureTitle:"გარე ხელისმოწერის მოთხოვნა",remoteSignatureDescription:"ხელის მოწერის ლინკი გაიგზავნება SMS-ით. ლინკი 14 დღეში იწურება.",fullName:"სახელი გვარი",destructiveActionHint:"ყურადღება, ეს ქმედება წაშლით დასრულდება",backdropDismissHint:"ფონის დაჭერით დახურვა",dateTimeTitle:"თარიღი და დრო",dateTitle:"თარიღი",timeTitle:"დრო",selectDateA11y:"თარიღის არჩევა",selectTimeA11y:"დროის არჩევა",sectionEmptyIncidents:"ინციდენტი არ დაფიქსირებულა",sectionEmptyBriefings:"ინსტრუქტაჟი ჯერ არ ჩატარებულა",sectionEmptyReports:"რეპორტი ჯერ არ შეიქმნა",sectionEmptyDocuments:"ფაილები არ არის ატვირთული",errorScreenTitle:"რაღაც არასწორად მოხდა",errorScreenSubtitle:"ეს გვერდი ვერ იტვირთა. სცადეთ თავიდან ან დაბრუნდით მთავარ გვერდზე.",goHome:"მთავარ გვერდზე დაბრუნება",tryAgain:"სცადე თავიდან",helpStepHint:"ნაბიჯის ახსნა",backButtonHint:"წინა ეკრანზე დაბრუნება",locationRowTapToSelect:"დააჭირეთ მდებარეობის ასარჩევად",locationRowChange:"შეცვლა",mapPickerHint:"შეეხეთ რუკას ან მოძებნეთ მისამართი",mapPickerClearA11yLabel:"მდებარეობის გასუფთავება",mapPickerClearA11yHint:"შეეხეთ მონიშნული მდებარეობის წასაშლელად",mapPickerRemovePin:"პინის მოხსნა",mapPickerChooseOnMap:"აირჩიეთ მდებარეობა რუკაზე",uploadedFilesSectionTitle:"ატვირთული ფაილები",uploadedFilesSectionEmpty:"ფაილები არ არის ატვირთული",uploadedFilesSectionEmptyTitle:"ფაილები არ არის",uploadedFilesSectionEmptyHint:"ატვირთეთ პროექტის დოკუმენტაცია, ფოტოები ან გეგმები.",uploadedFilesSectionUpload:"ფაილის ატვირთვა",uploadedFilesSectionCountLatest:"{{count}} ფაილი · ბოლოს {{date}}",signatureCanvasSignHereHint:"ამ სივრცეში ხელი მოაწერეთ",signatureCanvasDrawPrompt:"გთხოვთ, ხელი მოაწეროთ",tourGuideFinish:"დასრულება ✓",tourGuideNext:"შემდეგი →",inspectionResultSignatures:"ხელმოწერები",inspectionResultShare:"გაზიარება",inspectionResultShareLocked:"🔒 გაზიარება",dropdownPlaceholder:"აირჩიეთ...",dropdownCancel:"გაუქმება",excavatorYes:"კი",excavatorNo:"არა",excavatorDateLabel:"კონკრეტული თარიღი:",certManagerTitle:"სერტიფიკატები",certManagerEmpty:"სერტიფიკატი ჯერ არ დამატებულა",certManagerAdd:"სერტიფიკატის დამატება",certManagerAddHint:"ახალი სერტიფიკატის დამატება",certPhotoYes:"✓ ფოტო",certPhotoNo:"ფოტო არ არის",recordTypePillInspection:"შემოწმება",recordTypePillIncident:"ინციდენტი",recordTypePillBriefing:"ინსტრუქტაჟი",recordTypePillReport:"რეპორტი"},$e={expert:"შრომის უსაფრთხოების სპეციალისტი",xarachoSupervisor:"ხარაჩოს ზედამხედველი",xarachoAssembler:"ხარაჩოს ამწყობი",other:"სხვა"},Ne={title:"ანგარიშის პარამეტრები",currentPassword:"მიმდინარე პაროლი",newPassword:"ახალი პაროლი",confirmNewPassword:"გაიმეორეთ ახალი პაროლი",passwordPlaceholder:"პაროლი",repeatPasswordPlaceholder:"გაიმეორეთ პაროლი",changePassword:"პაროლის შეცვლა",changing:"იცვლება…",currentPasswordRequired:"მიმდინარე პაროლი აუცილებელია",currentPasswordWrong:"მიმდინარე პაროლი არასწორია",passwordMinLengthError:"ახალი პაროლი უნდა შეიცავდეს მინიმუმ {{min}} სიმბოლოს",passwordMustDiffer:"ახალი პაროლი უნდა იყოს განსხვავებული",passwordsMismatch:"პაროლები არ ემთხვევა",passwordCharCount:"{{n}}/{{min}} სიმბოლო",passwordChanged:"პაროლი შეიცვალა"},Be={title:"გვერდი არ მოიძებნა",body:"ეს გვერდი არ არსებობს ან წაშლილია.",backHome:"მთავარ გვერდზე"},Ie={title:"პროფილი",emailDisplay:"ელ-ფოსტა: {{email}}",deleteAccountLabel:"ანგარიშის წაშლა",deleteConfirmTitle:"ანგარიშის წაშლა",deleteConfirmBody:"დარწმუნებული ხართ? ეს მოქმედება შეუქცევადია.",updated:"პროფილი განახლდა",deleted:"ანგარიში წაიშალა",deleteAccountA11yHint:"ანგარიშის შეუქცევადი წაშლა"},Ee={cameraPermDenied:"კამერაზე წვდომა აკრძალულია",openSettings:"პარამეტრების გახსნა",library:"ბიბლიოთეკა",done:"დასრულება ({{count}})",libraryPermRequired:"ბიბლიოთეკაზე წვდომა საჭიროა გასაჭრელად",grantAccess:"წვდომის მიცემა"},je={nameLabel:"დასახელება",modelLabel:"მარკა / მოდელი",serialLabel:"სერ. ნომერი",noteLabel:"შენიშვნა",conditionGood:"კარგი",conditionService:"საჭ. მომს.",conditionUnusable:"გამოუსადეგ.",addPhoto:"+ ფოტო",addRow:"სტრიქონის დამატება",deleteRow:"სტრიქონის წაშლა",conditionGoodA11y:"✓ კარგია",conditionServiceFull:"⚠ საჭ. მომსახ.",conditionUnusableFull:"✗ გამოუსადეგარია",addPhotoA11y:"ფოტოს დამატება",addPhotoHint:"ფოტოს გადაღება ან ბიბლიოთეკიდან",deletePhotoA11y:"ფოტოს წაშლა"},Re={title:"რისკების შეფასება",ppeTitle:"ინდ. დაცვის საშუალებების განსაზღვრა",sectionTitle:"რისკების შეფასება",emptySubtitle:"ჯერ არ შექმნილა რისკის შეფასება",createFailed:"შექმნა ვერ მოხერხდა",addRiskAssessment:"რისკების შეფასება",addPpe:"იდს განსაზღვრა",entriesCount:"{{count}} ჩანაწერი",statusCompleted:"დასრულებული",generalInfo:"ზოგადი ინფორმაცია",hazards:"საფრთხეები",positions:"სამუშაო პოზიციები",addHazard:"საფრთხის დამატება",addPosition:"პოზიციის დამატება",hazardN:"საფრთხე #{{n}}",positionN:"პოზიცია #{{n}}",hazard:"საფრთხის იდენტიფიცირება",persons:"პირთა წრე",injuryType:"დაშავების / დაზიანების ტიპი",existingControls:"არსებული საკონტროლო ზომები",additionalControls:"დამატებითი საკონტროლო ზომები",measures:"გასატარებელი ზომები / რეაგირება",responsible:"პასუხისმგებელი პირი / ვადა",initialRisk:"საწყისი რისკი (ა × შ)",residualRisk:"ნარჩენი რისკი (ა × შ)",probability:"ალბათობა (ა)",severity:"შედეგი (შ)",position:"სამუშაო პოზიცია",activities:"სამუშაო აქტივობების აღწერა",hazardsCol:"საფრთხეები (რისკები)",bodyParts:"სხეულის დასაცავი ნაწილები",ppe:"ინდ. დაცვის საშუალებები",objectName:"ობიექტის დასახელება",assessorName:"შემფასებლის სახელი, გვარი",date:"თარიღი",time:"დრო",workDescription:"სამუშაოს მოკლე აღწერა",companyName:"კომპანიის დასახელება",objectNameId:"ობიექტი (დასახელება / ს.ნ.)",address:"ობიექტის მისამართი",hseSpecialist:"შრომის უსაფრთხოების სპეციალისტი",assessor:"შემფასებელი",companyRep:"კომპანიის წარმომადგენელი"},Me={companyInfo:"კომპანიის ინფო",orderNumber:"ბრძანების ნომერი",orderDate:"ბრძანების თარიღი",companyName:"კომპანიის დასახელება",objectAddress:"ობიექტის მისამართი",activityField:"საქმიანობის სფერო",directorName:"დირექტორი (სახელი გვარი)",summary:"შეჯამება",orderNumberShort:"ბრძანება №",city:"ქალაქი",code:"კოდი",director:"დირექტორი",object:"ობიექტი",specialist:"სპეციალისტი",idNumber:"პ/ნ",certNumber:"სერტიფიკატი №",assignedPerson:"დანიშნული პირი",certNumberShort:"სერტ. №",crane:"ამწე",directorSigned:"დირექტორი ✓",jobTitle:"თანამდებობა",load:"ტვირთი",operator:"ოპერატორი",operatorSigned:"ოპერატორი ✓",responsible:"პასუხისმგებელი",responsibleSigned:"პასუხისმ. ✓",signed:"ხელმოწერილია",specialistSigned:"სპეციალისტი ✓",docType:"ბრძანების ტიპი",selectDocType:"აირჩიეთ დოკუმენტის ტიპი",orderInfo:"ბრძანების ინფო",orderNumberPlaceholder:"ბრძანების ნომერი (მაგ. 05/2024)",cityLabel:"ქალაქი",orderDateLabel:"ბრძანების თარიღი",companyInfoLabel:"კომპანიის ინფო",companyNamePlaceholder:"კომპანიის დასახელება (შპს / სს ...)",identificationCode:"საიდენტიფიკაციო კოდი",legalAddress:"იურიდიული მისამართი",directorNameLabel:"დირექტორი (სახელი გვარი)",requiredField:"სავალდებულო ველი",responsiblePerson:"პასუხისმგებელი პირი",facilityNameAndAddress:"ობიექტის სახელი და მისამართი",fullName:"სახელი, გვარი",position:"თანამდებობა",personalId11digits:"პირადი ნომერი (11 ციფრი)",appointedPerson:"დანიშნული პირი",phoneNumber:"ტელეფონის ნომერი",objectSection:"ობიექტი",objectNameLabel:"ობიექტის დასახელება",objectAddressLabel:"ობიექტის მისამართი",personalId:"პირადი ნომერი",specialistTitle:"სპეციალისტი",specialistFullName:"სპეციალისტი (სახელი გვარი)",certNumberLabel:"სერტიფიკატის ნომერი",certIssueDate:"სერტიფიკატის გაცემის თარიღი",workPosition:"სამუშაო პოზიცია",operatorTitle:"ოპერატორი",idNumber11digits:"პირადობის ნომერი (11 ციფრი)",certExpiry:"სერტ. მოქმედების ვადა",contactPhone:"საკ. ტელეფონი",certPhoto:"სერტიფიკატის ფოტო",certStepTitle:"სერტიფიკატი",signaturesHandNote:"ხელმოწერები სრულდება ამობეჭდილ დოკუმენტზე ხელით.",craneData:"ამწის მონაცემები",craneModelType:"მოდელი / ტიპი",craneNumberLabel:"ამწის ნომერი",craneSerialTitle:"ამწის სერიული ნომერი",craneSerialHint:"მიუთითეთ ამწის ქარხნული / სარეგისტრაციო ნომერი.",craneMaxLoadLabel:"მაქს. ასაწევი ტვირთი (ტ.)",craneInspCert:"ამწის ინსპ. სერთიფ.",craneInspCertFull:"ამწის ინსპექციის სერთიფიკატი",signatures:"ხელმოწერები",directorLabel:"დირექტორი",signatureAdded:"ხელმოწერა დადებულია",resignature:"ხელახლა ხელმოწერა",addSignature:"+ ხელმოწერა",signatureRequired:"ხელმოწერა სავალდებულოა",techResponsible:"ტექ. პასუხისმგებელი",scaffoldSupervisorTitle:"ზედამხედველი (პასუხისმგებელი პირი)",orderTitle:"ბრძანება",qualificationSpecialty:"კვალიფიკაცია / სპეციალობა",nextButton:"შემდეგი",generatePdf:"PDF გენერირება",saveWithoutPdf:"შენახვა PDF-ის გარეშე",finishButton:"დასრულება",orderSaved:"ბრძანება შენახულია",saveFailed:"შენახვა ვერ მოხერხდა",projectNotFound:"პროექტი ვერ მოიძებნა",bothSignaturesRequired:"გთხოვთ, დააწეროთ ორივე ხელმოწერა",pdfSavedLocally:"PDF შენახულია ლოკალურად; სინქრონიზაცია მოხდება ქსელზე დაბრუნებისას",pdfGenerateFailed:"PDF-ის შექმნა ვერ მოხერხდა",photoUploadFailed:"ფოტო ვერ აიტვირთა",successTitle:"ბრძანება შეიქმნა!",successTitleLaborSafetySpecialist:"სპეციალისტი დანიშნულია!",successTitleAlcoholControl:"ალკოჰოლის კონტროლი დანიშნულია!",successTitleFireSafetyOrder:"სახანძრო უსაფრთხოების პასუხისმგებელი პირი დანიშნულია!",successTitleFireSafetyOrderEnterprise:"საწარმოს სახანძრო უსაფრთხოების პასუხისმგებელი პირი დანიშნულია!",successTitleCraneOperatorOrder:"კოშკურა ამწის ოპერატორი დანიშნულია!",successTitleCraneTechnicalOrder:"ამწის ტექნიკური შემოწმება დანიშნულია!",successSubtitle:"PDF ბრძანება გაიზიარა. ასლი ავტომატურად ატვირთება.",successPrimaryAction:"მთავარ გვერდზე",successEditTitle:"რედაქტირება",successEditSubtitle:"შეცვალე ბრძანების მონაცემები",successBackProjectsTitle:"პროექტებზე დაბრუნება",successBackProjectsSubtitle:"ნახე ყველა პროექტი",docFallback:"ბრძანება",orderNumberDisplay:"ბრძანება №{{number}}"},qe={title:"შემოწმების აქტი შენახულია!",viewPdf:"PDF-ის ნახვა",backHome:"მთავარ გვერდზე დაბრუნება",summaryLabel:"შეჯამება",description:"ყველა მონაცემი შენახულია. PDF რეპორტის ჩამოტვირთვა და ხელმოწერა შეგიძლიათ აქტის გვერდიდან."},ze={statusGood:"გამართული",statusBad:"დაზიანებული",componentsMissing:"ამ შაბლონში ქამრის კომპონენტები ვერ მოიძებნა.",exitButton:"გასვლა",harnessCountTitle:"რამდენი ქამარი სულ?",startButton:"დაწყება →",confirmButton:"ქამარი {{n}}{{suffix}} - დადასტურება →",problemsSuffix:" · {{count}} პრობლემა",harnessCountA11y:"ქამრების რაოდენობა",confirmA11y:"ქამარი {{n}} დადასტურება"},_e={chooseProject:"აირჩიეთ პროექტი",continueButton:"გაგრძელება →",newProject:"ახალი პროექტი",newProjectA11y:"ახალი პროექტის შექმნა"},Oe={clearTitle:"ყველა მონიშვნის წაშლა",clearBody:"დარწმუნებული ხართ?",saveFailed:"შენახვა ვერ მოხერხდა",saveTryAgain:"სცადეთ თავიდან",addText:"ტექსტის დამატება",headerTitle:"ფოტოს რედაქტირება",saving:"ინახება...",cancelA11yHint:"შეეხეთ მონიშვნის გასაუქმებლად",saveA11yHint:"შეეხეთ დახატული ფოტოს შესანახად",colorA11yPrefix:"ფერი: ",colorA11yHint:"შეეხეთ ამ ფერის ასარჩევად",toolA11yPrefix:"ხელსაწყო: ",toolA11yHint:"შეეხეთ ამ ხელსაწყოს ასარჩევად",widthA11yPrefix:"სისქე: ",widthA11yHint:"შეეხეთ ამ სისქის ასარჩევად",undoA11y:"უკან დაბრუნება",undoA11yHint:"შეეხეთ ბოლო ნაბიჯის გასაუქმებლად",clearAllA11y:"ყველაფრის წაშლა",clearAllA11yHint:"შეეხეთ ყველა მონიშვნის წასაშლელად",cancelTextA11yHint:"შეეხეთ ტექსტის დამატების გასაუქმებლად",addTextA11yHint:"შეეხეთ ტექსტის ფოტოზე დასამატებლად",cropTitle:"ფოტოს ჩამოჭრა",cropFree:"თავისუფალი",cropApply:"გამოყენება",cropA11y:"ჩამოჭრა",cropA11yHint:"შეეხეთ ფოტოს ჩამოსაჭრელად",rotateA11y:"შებრუნება",rotateA11yHint:"შეეხეთ ფოტოს 90 გრადუსით შესაბრუნებლად",resetTitle:"მონიშვნების წაშლა?",resetBody:"ჩამოჭრა წაშლის მიმდინარე მონიშვნებს.",resetConfirm:"გაგრძელება",tabCrop:"ჩამოჭრა",tabMarkup:"მონიშვნა",textPlaceholder:"ჩაწერეთ ტექსტი",reset:"აღდგენა",cropHint:"მასშტაბი და გადატანა",cropHintOverlay:"შეკუმშეთ მასშტაბისთვის · გადაიტანეთ გადასაადგილებლად",moveHint:"გადაიტანეთ ელემენტები ასარჩევად",doneA11yHint:"შეეხეთ რედაქტირების დასასრულებლად",resetCropA11yHint:"შეეხეთ ჩამოჭრის აღსადგენად"},Ge={discardTitle:"ცვლილებების გაუქმება?",discardBody:"შენახვის გარეშე გასვლისას ცვლილებები დაიკარგება.",problemLabel:"რა პრობლემაა?",discardContinue:"გაგრძელება",discardExit:"გასვლა",kamariIndexTitle:"ქამარი #{{index}}",touchComponentHint:"შეეხეთ კომპონენტს თუ აღმოაჩინეთ პრობლემა",photo:"ფოტო",close:"დახურვა",answerYesLabel:"კი",answerYesA11y:"კი — გამართულია",answerYesA11yHint:'შეეხეთ პასუხის "კი"-ს მისანიჭებლად',answerNoLabel:"არა",answerNoA11y:"არა — გამოვლენილია პრობლემა",answerNoA11yHint:'შეეხეთ პასუხის "არა"-ს მისანიჭებლად',noteChip:"შენიშვნა",addPhotoChip:"ფოტო",addPhotoA11yHint:"შეეხეთ ახალი ფოტოს ასატვირთად",choiceGood:"კარგი",choiceGoodA11y:"კარგი — ხარვეზი არ არის",choiceDeficient:"ხარვეზი",choiceDeficientA11y:"ხარვეზი — პრობლემა გამოვლინდა",defectDescription:"ხარვეზის აღწერა",exitTitle:"გამოსვლა?",exitBody:"პროგრესი შეინახება, მაგრამ შემოწმება არ დასრულდება.",exitContinue:"გაგრძელება",exitLeave:"გასვლა",deletePhotoA11y:"ფოტოს წაშლა",deletePhotoA11yHint:"შეეხეთ ამ ფოტოს წასაშლელად",questionSwipeA11y:"გადაფურცლეთ კითხვებს შორის გადასაადგილებლად",prevQuestion:"წინა კითხვა",prevQuestionA11yHint:"შეეხეთ წინა კითხვაზე გადასასვლელად",prevLabel:"უკან",finishLabel:"დასრულება",finishA11yHint:"შეეხეთ შემოწმების დასასრულებლად",nextQuestionA11y:"შემდეგი კითხვა",nextQuestionA11yHint:"შეეხეთ შემდეგ კითხვაზე გადასასვლელად",checklistProgress:"{{index}} / {{total}}",questionCounter:"კითხვა {{index}} / {{total}}",kamariCountTitle:"რამდენი ქამარი?",kamariOverviewTitle:"ქამრების მიმოხილვა",kamariOverviewSubtitle:"შეეხეთ ქამარს შემოწმებისთვის",kamariCardTitle:"ქამარი {{index}}",kamariProblems:"{{count}} პრობლემა",kamariInProgress:"მიმდინარეობს",kamariOk:"გამართულია"},Ue={cargoName:"ტვირთის დასახელება",cargoWeight:"სრული წონა (კგ)",deleteRowA11y:"სტრიქონის წაშლა"},Xe={otherPlaceholder:"სხვა",quantityLabel:"რაოდენობა",otherA11y:"სხვა"},We={layout:"განლაგება",layoutTextPhoto:"ტექსტი + ფოტო",layoutPhotoFull:"დიდი ფოტო",layoutTwoSide:"გვერდიგვერდ",layoutTwoStacked:"დაწყობილი",subtitleTextPhoto:"აღწერა გვერდით, ფოტო მარჯვნივ",subtitlePhotoFull:"დიდი ფოტო, სათაური ქვემოთ",subtitleTwoSide:"ორი ფოტო გვერდიგვერდ",subtitleTwoStacked:"ორი ფოტო ერთმანეთის ქვემოთ",slideTitleFallback:"სლაიდი {{n}}",deleteSlide:"სლაიდის წაშლა",deleteSlideHint:"შეეხეთ სლაიდის წასაშლელად",addPhoto:"+ ფოტოს დამატება",photosLabel:"ფოტოები",secondPhoto:"მეორე ფოტო",optionalLabel:"არასავალდებულო",statusCompleted:"დასრულებული",slidesSection:"სლაიდები",generatePdf:"PDF გენერირება",generatePdfLocked:"🔒 PDF გენერირება",pdfGenerateFailed:"PDF გენერაცია ვერ მოხერხდა",editFailed:"რედაქტირება ვერ მოხერხდა",deleteSlideTitle:"სლაიდის წაშლა?",addSlideRequired:"მინიმუმ ერთი სლაიდი დაამატეთ",noSlidesYet:"ჯერ სლაიდები არ არის",addFirstSlideHint:"დაამატეთ პირველი სლაიდი ქვემოთ",addSlide:"სლაიდის დამატება",generating:"გენერირდება…",generatePdfButton:"PDF-ის გენერაცია →",slideFlowTitle:"სლაიდი {{n}}",slideTitleLabel:"სლაიდის სათაური",descriptionLabel:"აღწერა",successTitle:"რეპორტი მზადაა!",successSubtitle:"{{count}} სლაიდი · {{title}}",backToHomeAction:"დაბრუნდი საწყის გვერდზე",reportTitleLabel:"რეპორტის სახელი",nextButton:"შემდეგი →",createFailed:"რეპორტის შექმნა ვერ მოხერხდა",slidesCountSuffix:"{{count}} სლაიდი",pleaseSign:"გთხოვთ, ხელი მოაწეროთ",signatureUploadFailed:"ხელმოწერის ატვირთვა ვერ მოხერხდა"},Ve={deleteTitle:"ინციდენტის წაშლა",deleteBody:"გსურთ ამ ინციდენტის წაშლა?",pdfShareFailed:"PDF-ის გაზიარება ვერ მოხერხდა",pdfPreparing:"მზადდება...",pdfAddingPhotos:"ფოტოები ემატება...",pdfBuilding:"მზადდება PDF...",pdfCreated:"PDF შექმნილია",pdfSavedLocally:"PDF შენახულია ლოკალურად; სინქრონიზაცია მოხდება ქსელზე დაბრუნებისას",pdfCreateFailed:"PDF-ის შექმნა ვერ მოხერხდა",headerTitle:"ინციდენტი",notFound:"ინციდენტი ვერ მოიძებნა",draftChip:"დრაფტი",sectionVictim:"დაზარალებული",sectionCircumstance:"გარემოება",nearMissNote:"საშიში შემთხვევა - დაზიანება არ მომხდარა",fieldName:"სახელი, გვარი",fieldRole:"თანამდებობა",fieldLocation:"ადგილი",fieldProject:"პროექტი",sectionDescription:"შემთხვევის გარემოება",sectionCause:"სავარაუდო მიზეზი",sectionActions:"მიღებული ზომები",sectionWitnesses:"მოწმეები",sectionPhotos:"ფოტო მასალა",labourWarning:"შრომის შემოწმების აქტის სამსახური უნდა ეცნობოს 24 საათის განმავლობაში:",pdfShare:"PDF გაზიარება",pdfUpdate:"განახლება",pdfGenerate:"PDF გენერირება",pdfGenerateLocked:"🔒 PDF გენერირება",newIncident:"ახალი ინციდენტი",reportSubject:"შრომის უსაფრთხოების ინციდენტის ანგარიში",pdfDone:"დასრულდა ✓",pdfCreateFailedSaved:"ინციდენტი შენახულია — PDF ვერ შეიქმნა. სცადეთ ინციდენტის გვერდიდან.",fieldLocationExact:"ზუსტი ადგილი",labourNoticeWarning:"შრომის ინსპექციის სამსახური უნდა ეცნობოს 24 საათის განმავლობაში: 0322 43 00 43",flowTitle:"ინციდენტი",selectTypeError:"ინციდენტის ტიპის მითითება სავალდებულოა",savedDraft:"დრაფტი შენახულია",createFailed:"ინციდენტის შექმნა ვერ მოხერხდა",step1Title:"რა ტიპის ინციდენტი მოხდა?",step2Title:"ვინ დაზარალდა და სად?",nearMissNoteShort:"საშიში შემთხვევა — ფიზიკური დაზიანება არ მომხდარა.",fieldInjuredName:"დაზარალებულის სახელი, გვარი",fieldInjuredRole:"თანამდებობა / როლი",fieldDateTime:"თარიღი და დრო",step3Title:"გარემოებების აღწერა",fieldWhatHappened:"რა მოხდა?",fieldProbableCause:"სავარაუდო მიზეზი",fieldActionsTaken:"მიღებული ზომები",fieldWitnessName:"მოწმის სახელი, გვარი",addWitnessA11y:"მოწმის დამატება",addPhoto:"+ ფოტოს დამატება",step4Title:"გადახედვა და ხელმოწერა",summaryInjured:"დაზარალებული",summaryPhotos:"ფოტოები",photosUnit:"ფოტო",specialistFallback:"უსაფრთხოების სპეციალისტი",inspectorRole:"შრომის უსაფრთხოების სპეციალისტი",signedChip:"ხელმოწერილია",saveWithoutSignature:"დრაფტად შენახვა"},Qe={typeSectionHeader:"ტიპი / სახეობა",identificationSection:"იდენტიფიკაცია",characteristicsSection:"მახასიათებლები",markingSection:"მარკირება",markingPlaceholder:"აირჩიეთ მარკირება",nextInspectionSection:"მომდევნო შემოწმება",serialIdLabel:"სერიული ნომერი / ID",manufacturerLabel:"მწარმოებელი",yearMadeLabel:"წარმოების წელი",wllLabel:"დასაშვები სამუშაო დატვირთვა, WLL (კგ)",unitSafetyLabel:"ერთეულების რაოდენობა",typeRequired:"აირჩიეთ ტიპი"},Ke={title:"ალკოტესტი",deviceSerial:"მოწყობილობის სერიული ნომერი",loadFailed:"ჟურნალის ჩატვირთვა ვერ მოხერხდა",createFailed:"ჟურნალის შექმნა ვერ მოხერხდა",saveFailed:"შენახვა ვერ მოხერხდა",shiftComplete:"ცვლა დასრულდა",error:"შეცდომა - გთხოვთ სცადოთ ხელახლა",statusSafe:"სამუშაოდ დაშვება დაშვებულია",statusWarning:"საჭიროა ზედამხედველობა",statusFail:"სამუშაოდ დაშვება აკრძალულია",statusSafeShort:"ნორმა",statusWarningShort:"გაფრთხილება",statusFailShort:"გადაჭარბება",closedBadge:"დასრულებული",noEntryToday:"დღეს ჯერ ჩანაწერი არ დაწყებულა",entryNotFound:"ჩანაწერი ვერ მოიძებნა",startEntry:"დღევანდელი ჩანაწერის დაწყება",noEntry:"ჩანაწერი არ არის · დაიწყე +",personDenied:"პირი ვერ დაიშვება სამუშაოდ",repeatTest:"განმეორებითი ტესტი 15 წუთში",shiftEnd:"ცვლის დასრულება",addEntry:"ჩანაწერის დამატება",pdfFailed:"PDF გენერაცია ვერ მოხერხდა",pdfShare:"PDF გაზიარება",relToday:"დღეს",relDay1:"1 დ.",relDayN:"{{count}} დ.",stepPerson:"პირი",stepTestType:"ტესტის ტიპი",stepResult:"შედეგი",stepSignature:"ხელმოწერა",searchPlaceholder:"სახელი / გვარი...",nameLabel:"სახელი / გვარი",positionLabel:"პოზიცია",primaryTest:"პირველადი",repeatTestType:"↩ განმეორებითი",repeatTestOf:"{{name}}-ის განმეორებითი ტესტი",resultValid:"შეიყვანეთ სწორი მაჩვენებელი",sigPrompt:"{{name}}-მა ხელი მოაწეროს ტესტის შედეგს",sigSaved:"ხელმოწერა შენახულია",tapToSign:"შეეხეთ ხელმოსაწერად",refuseSignature:"ხელმოწერაზე უარი",sigOrRefuseRequired:"საჭიროა ხელმოწერა ან უარის მონიშვნა",nextStep:"შემდეგი",responsiblePerson:"პასუხისმგებელი პირი",totalTested:"სულ ტესტირებულია: {{count}} პირი",finishAndPdf:"დასრულება და PDF გენერაცია",repeatTestCard:"↩ ტესტი"},Ye={title:"ხარაჩო 3D გიდი",hint:"დააჭირეთ ნაწილს ინსტრუქციის სანახავად",frameLeft:"მარცხენა ვერტიკალური კოშკურა",frameRight:"მარჯვენა ვერტიკალური კოშკურა",crossBrace:"გადამკვეთი საყრდენები (X-ბრას)",platform:"სამუშაო პლატფორმა / დეკა",guardrail:"დამცავი ღობეები",wheels:"თვლები / კოლესები"},Ze={title:"შაბლონები",labelSystem:"სისტემური",labelMine:"ჩემი",requiredSigners:"საჭირო: {{signers}}"},Je={success:oe,details:ne,common:se,a11y:re,geocode:le,errors:de,notifications:ce,tabs:pe,auth:ue,home:me,projects:ge,projectSigner:fe,inspections:he,certificates:be,qualifications:ye,history:ve,records:xe,drafts:Pe,more:Se,calendar:we,regulations:Le,termsScreen:Te,signature:ke,remoteSigner:Fe,crew:Ae,briefings:Ce,pdf:De,components:He,roles:$e,account:Ne,notFound:Be,profile:Ie,photoPicker:Ee,generalEquipment:je,risk:Re,orders:Me,inspectionDone:qe,harnessList:ze,flowProjectPicker:_e,photoAnnotator:Oe,wizard:Ge,cargoPlatform:Ue,inputs:Xe,reports:We,incidents:Ve,slingsId:Qe,breathalyzer:Ke,guide:Ye,templates:Ze};function O(t,e){const r=t.split(".");let s=Je;for(const l of r)if(s=s==null?void 0:s[l],s===void 0)break;if(typeof s=="string")return e?s.replace(/\{\{(\w+)\}\}/g,(l,d)=>String(e[d]??"")):s}function et(t){const e=new Date(t),r=String(e.getDate()).padStart(2,"0"),s=String(e.getMonth()+1).padStart(2,"0"),l=e.getFullYear(),d=String(e.getHours()).padStart(2,"0"),o=String(e.getMinutes()).padStart(2,"0");return`${r}.${s}.${l} ${d}:${o}`}function M(t){return String(t).padStart(2,"0")}function a(t){return t==null?"":t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function tt(t,e,r,s){var v,h;const l=a(r.slice(0,50)),d=t.created_at?et(t.created_at):"",o=d?`${l} - ${d}`:l,P=((v=t.caption)==null?void 0:v.startsWith("row:"))??!1,p=t.address??((h=t.caption)!=null&&h.startsWith("addr:")?t.caption.slice(5):null);let m="";p?m=`<div class="photo-caption photo-location">გადაღებულია: ${a(p)}</div>`:!P&&t.caption&&(m=`<div class="photo-caption">${a(t.caption)}</div>`);const i=t.storage_path,f=i.startsWith("data:"),A=/^(file|content|ph|asset):\/\//.test(i),C=/^https?:\/\//.test(i);return!f&&!A&&!C?`<div class="photo-item${e?" failed":""}">
      <div class="photo-img-wrap">
        <div class="photo-missing">${s("pdf.imageUnavailable")}</div>
      </div>
      <div class="photo-caption">${o}</div>
      ${m}
    </div>`:`<div class="photo-item${e?" failed":""}">
    <div class="photo-img-wrap">
      <img src="${a(i)}" alt="${a(s("pdf.photoAlt"))}"
        onerror="this.style.display='none';this.parentElement.innerHTML='<div class=\\'photo-missing\\'>${a(s("pdf.imageUnavailable"))}</div>';" />
    </div>
    <div class="photo-caption">${o}</div>
    ${m}
  </div>`}function at(t){const e=(t??"").trim().toLocaleLowerCase("ka-GE");return e?/(პრობლემ|აღენიშნება|არა|fail|bad|no|broken|damaged|defect)/i.test(e):!1}function it(t){const e=(t??"").trim().toLocaleLowerCase("ka-GE");return e?/(პრობლემ|აღენიშნება|არა|fail|bad|no|broken|damaged|defect)/i.test(e)?"fail":/(კი|ok|pass|yes|good|ok\.|ნორმ|გამართულია)/i.test(e)?"pass":/(არ გააჩნია|^na$|n\/a)/i.test(e)?"neutral":null:null}function _(t,e){return t==="pass"?"კი":t==="fail"?"არა":e&&/კი|ok|pass|yes|good|ok\.|ნორმ|გამართულია|არა|fail|bad|no|broken|damaged|defect/i.test(e)?e:"-"}function ot(t,e,r=[],s=!1,l){const d=e!=null&&e.comment?`<div class="question-comment">${l("pdf.commentLabel")}: ${a(e.comment)}</div>`:"",o=e!=null&&e.notes?`<div class="question-notes">${l("pdf.notesLabel")}: ${a(e.notes)}</div>`:"",P=r.length===1?"photo-grid single":"photo-grid",p=r.length>0?`<div class="photo-section-title">${l("pdf.photosTitle")}</div>
         <div class="${P}">${r.map(i=>tt(i,s,t.title,l)).join("")}</div>`:"",m=`question-card${s?" is-failed":""}`;switch(t.type){case"yesno":{const i=e==null?void 0:e.value_bool,f=i===!0?`<span class="answer-pill pill-yes">✓ ${l("pdf.yes")}</span>`:i===!1?`<span class="answer-pill pill-no">✗ ${l("pdf.no")}</span>`:'<span class="pill-empty">-</span>';return`<div class="${m}">
        <div class="question-title">${a(t.title)}</div>
        <div class="question-answer">${f}</div>
        ${d}${o}${p}
      </div>`}case"measure":{const i=e==null?void 0:e.value_num;return`<div class="${m}">
        <div class="question-title">${a(t.title)}</div>
        <div class="question-answer">${i??"-"} ${a(t.unit??"")}</div>
        ${d}${o}${p}
      </div>`}case"freetext":return`<div class="${m}">
        <div class="question-title">${a(t.title)}</div>
        <div class="question-answer">${a((e==null?void 0:e.value_text)??"-")}</div>
        ${d}${o}${p}
      </div>`;case"photo_upload":return`<div class="${m}">
        <div class="question-title">${a(t.title)}</div>
        ${p}${d}${o}
      </div>`;case"component_grid":{const i=t.grid_rows??[],f=t.grid_cols??[],A=(e==null?void 0:e.grid_values)??{},C=f.map(h=>`<th>${a(h)}</th>`).join(""),v=i.map(h=>{const x=f.map(T=>{var k;return((k=A[h])==null?void 0:k[T])??""}),L=x.some(T=>at(T)),D=f.map((T,k)=>{const g=x[k],F=it(g);return F==="pass"?`<td><span class="cell-status cell-status--pass">${a(_("pass",g))}</span></td>`:F==="fail"?`<td><span class="cell-status cell-status--fail">${a(_("fail",g))}</span></td>`:F==="neutral"?`<td><span class="cell-status cell-status--neutral">${a(_("neutral",g))}</span></td>`:`<td>${a(g)}</td>`}).join("");return`<tr${L?' class="is-problem"':""}><th>${a(h)}</th>${D}</tr>`}).join("");return`<div class="${m}">
        <div class="question-title">${a(t.title)}</div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th></th>${C}</tr></thead>
            <tbody>${v}</tbody>
          </table>
        </div>
        ${d}${o}${p}
      </div>`}default:return""}}const nt=["იანვარი","თებერვალი","მარტი","აპრილი","მაისი","ივნისი","ივლისი","აგვისტო","სექტემბერი","ოქტომბერი","ნოემბერი","დეკემბერი"];function st(t){const e=new Date(t);return Number.isNaN(e.getTime())?"":`${e.getDate()} ${nt[e.getMonth()]} ${e.getFullYear()}`}function rt(t){if(!t)return"";const e=!!t.creatorSignature,r=Math.max(0,t.additionalRowsCount|0);if(!e&&r===0)return"";const s=O("pdf.signaturesTitle")??"ხელმოწერები",l=e?lt(t.creatorSignature):"",d=r>0?dt(r):"";return`
    <div class="signatures-section">
      <div class="signatures-heading">
        <span class="signatures-heading-text">${a(s)}</span>
        <div class="signatures-heading-rule"></div>
      </div>
      ${l}
      ${d}
    </div>
  `}function lt(t){const e=st(t.capturedAtIso);return`
    <div class="signatures-creator">
      <div class="signatures-creator-img">
        <img src="data:image/png;base64,${a(t.pngBase64)}" alt="ხელმოწერა" />
      </div>
      <div class="signatures-creator-rule"></div>
      <div class="signatures-creator-meta">
        <span class="signatures-creator-name">${a(t.creatorName||"-")}</span>
        ${e?`<span class="signatures-creator-date">${a(e)}</span>`:""}
      </div>
    </div>
  `}function dt(t){const e=[];for(let r=0;r<t;r+=1)e.push(`
      <div class="signatures-empty-slot">
        <div class="signatures-empty-row">
          <span class="signatures-empty-label">ხელმოწერა:</span>
          <span class="signatures-empty-line signatures-empty-line-long"></span>
        </div>
        <div class="signatures-empty-row signatures-empty-row-split">
          <span class="signatures-empty-half">
            <span class="signatures-empty-label">სახელი:</span>
            <span class="signatures-empty-line signatures-empty-line-short"></span>
          </span>
          <span class="signatures-empty-half">
            <span class="signatures-empty-label">თარიღი:</span>
            <span class="signatures-empty-line signatures-empty-line-short"></span>
          </span>
        </div>
      </div>
    `);return e.join("")}function ct(t){if(t.logo)return`<img class="project-brand-logo" src="${a(t.logo)}" alt="${a(t.company_name||t.name)}" />`;const e=(t.company_name||t.name||"").trim(),r=e?Array.from(e).slice(0,2).join("").toLocaleUpperCase("ka-GE"):"-";return`<div class="project-brand-initials">${a(r)}</div>`}function pt(){return`
    :root {
      /* ── Brand / structure: monochrome ink + warm neutrals ── */
      --ink:         #1A1A1A;   /* primary text, avatar, section numerals */
      --ink-soft:    #4E4A44;   /* secondary text */
      --gray:        #9C988F;   /* labels / captions */
      --line:        #D6D6D1;   /* hairlines / borders */
      --line-strong: #C2BEB6;   /* header rule, strong dividers */
      --bg-soft:     #F2F1EC;   /* warm surface fills */
      --bg-subtle:   #E9E7E0;   /* table head / zebra rows */

      /* ── Single brand accent: ORANGE ── */
      --accent:      #FF6D2E;   /* the only brand colour; structural accents */
      --accent-soft: #FFF3EE;   /* accent tint */

      /* ── Semantic: verdict + answers ONLY ──
         The brand used to be this green. After the rebrand the only remaining
         --green* consumers are genuinely semantic: the "safe" hero verdict
         bar/value, the "yes" answer pill, and pass grid cells. */
      --green:       #10B981;   /* success — "safe" verdict + pass markers */
      --green-dark:  #0E9C6F;   /* pass text on tint (darkened success) */
      --green-tint:  #D1FAE5;   /* pass pill / status-pass background */
      --red:         #EF4444;   /* danger — unsafe / no */
      --red-tint:    #FEE2E2;   /* fail pill / problem-row background */
      --amber:       #B45309;   /* caution text */
      --amber-bg:    #FEF3C7;   /* caution background */

      /* ── Scale ── */
      --radius:      12px;      /* card radius */
      --radius-lg:   16px;      /* hero card radius */
    }
`}function ut(t){const{isPdf:e}=t;return`
    ${pt()}

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Helvetica, Arial, sans-serif;
      color: var(--ink);
      line-height: 1.55;
      background: #ffffff;
      ${e?"padding: 20px;":"padding: 16px;"}
      font-size: 11px;
    }

    /* @page margins removed - caused hangs on iOS WKWebView print renderer.
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
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding-bottom: 12px;
      position: relative;
      z-index: 1;
    }
    .header-brand { display: flex; align-items: center; gap: 14px; flex: 1; min-width: 0; }
    .header-titles { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
    .report-title {
      font-size: 18px;
      font-weight: 800;
      color: var(--ink);
      line-height: 1.25;
    }
    .report-company {
      font-size: 10px;
      font-weight: 600;
      color: var(--gray);
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .project-brand-logo,
    .project-brand-initials {
      width: 56px; height: 56px;
      border-radius: 50%;
      display: block;
      flex-shrink: 0;
    }
    .project-brand-logo { object-fit: cover; }
    .project-brand-initials {
      background: var(--ink);
      color: #fff;
      font-weight: 700;
      font-size: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .header-right { flex-shrink: 0; }
    .report-id-chip {
      font-family: 'SF Mono', 'Menlo', monospace;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
      color: var(--ink-soft);
      background: var(--bg-soft);
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 5px 12px;
      white-space: nowrap;
    }
    /* Ink rule carrying a single orange accent tick at its left edge. The tick
       is a real inline element (.header-rule-tick), not a ::before pseudo —
       the WKWebView print path renders real elements far more reliably. */
    .header-rule {
      position: relative;
      height: 2px;
      background: var(--ink);
      border: none;
      margin: 0 0 20px;
    }
    .header-rule-tick {
      position: absolute;
      top: 0; left: 0;
      width: 48px; height: 2px;
      background: var(--accent);
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

    /* ── Hero summary (verdict + conclusion, top of report) ──
       Replaces the old full-bleed .status-hero banner AND the bottom
       .conclusion-card. Neutral card; semantic colour is confined to the
       verdict-coloured left border + verdict value. The single orange accent
       is the conclusion label. border-left (not a flex bar) is used so the
       accent survives the WKWebView print path — same technique the old
       .conclusion-card relied on. */
    .hero-summary {
      background: var(--bg-soft);
      border: 1px solid var(--line);
      border-left: 6px solid var(--gray);
      border-radius: var(--radius-lg);
      padding: 16px 18px;
      margin-bottom: 16px;
      position: relative;
      z-index: 1;
      ${e?"page-break-inside: avoid;":""}
    }
    .hero-summary.is-safe       { border-left-color: var(--green); }
    .hero-summary.is-unsafe     { border-left-color: var(--red); }
    .hero-summary.is-caution    { border-left-color: var(--amber); }
    .hero-summary.is-incomplete { border-left-color: var(--gray); }

    .hero-summary-verdict {
      display: flex;
      align-items: baseline;
      gap: 10px;
      flex-wrap: wrap;
    }
    .hero-verdict-label {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--gray);
    }
    .hero-verdict-value {
      font-size: 18px;
      font-weight: 800;
      line-height: 1.25;
    }
    .hero-summary.is-safe       .hero-verdict-value { color: var(--green-dark); }
    .hero-summary.is-unsafe     .hero-verdict-value { color: var(--red); }
    .hero-summary.is-caution    .hero-verdict-value { color: var(--amber); }
    .hero-summary.is-incomplete .hero-verdict-value { color: var(--ink-soft); }

    .hero-summary-conclusion {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--line);
    }
    .hero-conclusion-label {
      display: block;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--accent);
      margin-bottom: 6px;
    }
    .hero-conclusion-text {
      font-size: 13px;
      color: var(--ink);
      line-height: 1.65;
      margin: 0;
    }

    /* ── TOC ── */
    .toc-box {
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background: var(--bg-soft);
      padding: 16px;
      margin-bottom: 16px;
      position: relative;
      z-index: 1;
    }
    .toc-heading {
      font-size: 10px;
      font-weight: 800;
      color: var(--ink);
      text-transform: uppercase;
      letter-spacing: 1px;
      padding-left: 10px;
      border-left: 3px solid var(--accent);
      margin-bottom: 12px;
    }
    .toc-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 7px 0;
      border-bottom: 1px solid var(--line);
    }
    .toc-item:last-child { border-bottom: none; }
    .toc-num {
      font-family: 'SF Mono', 'Menlo', monospace;
      font-size: 12px;
      font-weight: 700;
      color: var(--ink);
      min-width: 22px;
    }
    .toc-name { flex: 1; font-size: 12px; color: var(--ink); font-weight: 600; }
    .toc-count { font-size: 10px; color: var(--gray); font-weight: 600; }

    /* ── Section ── */
    .section {
      margin-bottom: 24px;
      position: relative;
      z-index: 1;
    }
    .section-header { margin: 8px 0; }
    .section-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--ink);
      border-left: 3px solid var(--accent);
      padding-left: 10px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .section-num {
      font-family: 'SF Mono', 'Menlo', monospace;
      font-size: 11px;
      font-weight: 800;
      color: #fff;
      background: var(--ink);
      border-radius: 6px;
      padding: 2px 7px;
      line-height: 1.4;
    }
    .section-name { color: var(--ink); }

    /* ── Question card ── */
    .question-card {
      background: #fff;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      padding: 12px 14px;
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
      border-radius: 999px;
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
    .data-table thead th { background: var(--bg-subtle); color: var(--ink); }
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
      border-top: 1px solid var(--line);
      color: var(--ink);
    }
    .data-table tbody tr:nth-child(even) td,
    .data-table tbody tr:nth-child(even) th { background: var(--bg-soft); }
    .data-table tbody tr.is-problem td,
    .data-table tbody tr.is-problem th {
      background: var(--red-tint);
      border-left: 3px solid var(--red);
    }
    .cell-status { font-weight: 700; }
    .cell-status--pass { color: var(--green-dark); }
    .cell-status--fail { color: var(--red); }
    .cell-status--neutral { color: var(--gray); }

    /* ── Signatures section (creator capture + empty hand-sign slots) ── */
    .signatures-section {
      position: relative;
      z-index: 1;
      margin-top: 24px;
      ${e?"page-break-inside: avoid;":""}
    }
    .signatures-heading {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 14px;
    }
    .signatures-heading-text {
      font-size: 14px;
      font-weight: 700;
      color: var(--ink);
    }
    .signatures-heading-rule { flex: 1; height: 1px; background: var(--line); }

    /* Creator (digital) block */
    .signatures-creator {
      margin-bottom: 18px;
    }
    .signatures-creator-img {
      height: 100px;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      padding: 4px 0;
    }
    .signatures-creator-img img {
      max-height: 100px;
      max-width: 280px;
      display: block;
    }
    .signatures-creator-rule {
      height: 1px;
      background: var(--ink);
      margin-bottom: 6px;
    }
    .signatures-creator-meta {
      display: flex;
      align-items: baseline;
      gap: 12px;
    }
    .signatures-creator-name {
      font-size: 13px;
      font-weight: 700;
      color: var(--ink);
    }
    .signatures-creator-date {
      font-size: 11px;
      color: var(--ink-soft);
    }

    /* Empty hand-sign slots */
    .signatures-empty-slot {
      padding: 10px 0;
      border-top: 1px solid var(--line);
    }
    .signatures-empty-slot:first-child { border-top: none; }
    .signatures-empty-row {
      display: flex;
      align-items: flex-end;
      gap: 8px;
      margin-bottom: 14px;
    }
    .signatures-empty-row:last-child { margin-bottom: 0; }
    .signatures-empty-row-split { gap: 28px; }
    .signatures-empty-half {
      display: flex;
      align-items: flex-end;
      gap: 8px;
      flex: 1;
    }
    .signatures-empty-label {
      font-size: 11px;
      color: var(--ink-soft);
      font-weight: 600;
      white-space: nowrap;
    }
    .signatures-empty-line {
      display: inline-block;
      border-bottom: 1px solid var(--ink);
      align-self: flex-end;
    }
    .signatures-empty-line-long {
      flex: 1;
      height: 80px;
    }
    .signatures-empty-line-short {
      flex: 1;
      height: 40px;
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
      .question-card, .photo-item, .section, .signatures-section,
      .hero-summary, .cert-card {
        page-break-inside: avoid;
      }
    }
`}function mt(t){var H;const{questionnaire:e,template:r,project:s,questions:l,answers:d,signaturesSession:o=null,photosByAnswer:P={},attachments:p=[],mode:m="pdf"}=t,i=(n,u)=>O(n,u)??n,f=m==="pdf",A=e.status!=="completed",C=n=>d.find(u=>u.question_id===n.id),v=e.created_at?new Date(e.created_at).toLocaleDateString("ka-GE",{year:"numeric",month:"long",day:"numeric"}):"-",h=e.id.slice(0,8).toUpperCase();let x=null;e:for(const n of Object.values(P))for(const u of n){const S=u.address??((H=u.caption)!=null&&H.startsWith("addr:")?u.caption.slice(5):null);if(S){x=S;break e}}const L=Array.from(new Set(l.map(n=>n.section))).sort((n,u)=>n-u),D=L.map((n,u)=>{const S=l.filter(b=>b.section===n);return`<div class="toc-item"><span class="toc-num">${M(u+1)}</span><span class="toc-name">${a(String(n))}</span><span class="toc-count">${i("pdf.tocQuestionCount",{count:S.length})}</span></div>`}).join(""),N=L.map((n,u)=>{const S=l.filter(b=>b.section===n).sort((b,c)=>b.order-c.order).map(b=>{const c=C(b),y=c?P[c.id]??[]:[],j=(c==null?void 0:c.value_bool)===!1;return ot(b,c,y,j,i)}).join("");return`
        <div class="section">
          <div class="section-header">
            <h2 class="section-title">
              <span class="section-num">${M(u+1)}</span>
              <span class="section-name">${a(String(n))}</span>
            </h2>
          </div>
          <div class="section-body">${S}</div>
        </div>
      `}).join(""),T=rt(o),k=p.length>0?`
        <div class="section" ${f?'style="page-break-before: always;"':""}>
          <div class="section-header">
            <h2 class="section-title">
              <span class="section-num">${M(L.length+1)}</span>
              <span class="section-name">${i("pdf.attachedCerts")}</span>
            </h2>
          </div>
          <div class="cert-grid">
            ${p.map(n=>`
              <div class="cert-card">
                <div class="cert-title">${a(n.cert_type)}</div>
                ${n.cert_number?`<div class="cert-meta-row"><span class="cert-meta-label">№</span> ${a(n.cert_number)}</div>`:""}
                ${n.photo_data_url?`<div class="cert-img-wrap">
                      <img src="${n.photo_data_url}" alt="${a(n.cert_type)}" class="cert-img"
                        onerror="this.style.display='none';this.parentElement.innerHTML='<div class=\\'photo-missing\\'>${a(i("pdf.imageUnavailable"))}</div>';" />
                    </div>`:""}
              </div>
            `).join("")}
          </div>
        </div>
      `:"",g=e.safety_verdict??(e.is_safe_for_use===!0?"safe":e.is_safe_for_use===!1?"unsafe":null),F=g==="safe"?"is-safe":g==="unsafe"?"is-unsafe":g==="caution"?"is-caution":"is-incomplete",B=i(g==="safe"?"pdf.statusSafe":g==="caution"?"pdf.statusCaution":g==="unsafe"?"pdf.statusNotSafe":"pdf.statusIncomplete"),I=`
    <div class="hero-summary ${F}">
      <div class="hero-summary-verdict">
        <span class="hero-verdict-label">${i("pdf.verdictLabel")}</span>
        <span class="hero-verdict-value">${B}</span>
      </div>
      <div class="hero-summary-conclusion">
        <span class="hero-conclusion-label">${i("pdf.conclusionTitle")}</span>
        <p class="hero-conclusion-text">${a(e.conclusion_text??"-")}</p>
      </div>
    </div>
  `,E=A?`<div class="watermark">${i("pdf.watermarkDraft")}</div>`:"";return`<!DOCTYPE html>
<html lang="ka">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${i("pdf.htmlTitle",{templateName:a(r.name)})}</title>
  <style>${ut({isPdf:f})}</style>
</head>
<body>
  ${E}

  <div class="report-header">
    <div class="header-brand">
      ${ct(s)}
      <div class="header-titles">
        <div class="report-title">${a(r.name)}</div>
        <div class="report-company">${a(s.company_name)}</div>
      </div>
    </div>
    <div class="header-right">
      <span class="report-id-chip">${h}</span>
    </div>
  </div>
  <div class="header-rule"><span class="header-rule-tick"></span></div>

  <div class="info-card">
    <div class="info-row">
      <span class="info-label">${i("pdf.infoCompany")}</span>
      <span class="info-value">${a(s.company_name)}</span>
    </div>
    <div class="info-row">
      <span class="info-label">${i("pdf.infoObject")}</span>
      <span class="info-value">${a(s.address??"-")}</span>
    </div>
    <div class="info-row">
      <span class="info-label">${i("pdf.metaDate",{date:""}).replace(/[:：].*/,"").trim()||"თარიღი"}</span>
      <span class="info-value">${v}</span>
    </div>
    <div class="info-row">
      <span class="info-label">ID</span>
      <span class="info-value" style="font-family:'SF Mono','Menlo',monospace;font-size:12px;">${h}</span>
    </div>
    ${r.category==="harness"?`
    <div class="info-row" style="grid-column:1 / -1;">
      <span class="info-label">${i("pdf.infoHarness")}</span>
      <span class="info-value">${a(e.harness_name??"-")}</span>
    </div>`:""}
    ${x?`
    <div class="info-row" style="grid-column:1 / -1;">
      <span class="info-label">📍 ლოკაცია</span>
      <span class="info-value">${a(x)}</span>
    </div>`:""}
  </div>

  ${I}

  <div class="toc-box">
    <div class="toc-heading">${i("pdf.tocTitle")}</div>
    ${D}
    ${p.length>0?`
    <div class="toc-item">
      <span class="toc-num">${M(L.length+1)}</span>
      <span class="toc-name">${i("pdf.attachedCerts")}</span>
      <span class="toc-count">${p.length}</span>
    </div>`:""}
  </div>

  ${N}

  ${T}

  ${k}
</body>
</html>`}function St(){var F,B,I,E,H,n,u,S,b;const{id:t}=W(),[e]=V(),r=e.get("preview")==="1",l=((F=Q().state)==null?void 0:F.signaturesSession)??null,d=R.useRef(null),o=$({queryKey:z.detail(t),queryFn:()=>Z(t),enabled:!!t}),P=$({queryKey:K.detail((B=o.data)==null?void 0:B.project_id),queryFn:()=>J(o.data.project_id),enabled:!!((I=o.data)!=null&&I.project_id)}),p=$({queryKey:["template",(E=o.data)==null?void 0:E.template_id],queryFn:()=>ee(o.data.template_id),enabled:!!((H=o.data)!=null&&H.template_id)}),m=$({queryKey:z.questions((n=o.data)==null?void 0:n.template_id),queryFn:()=>te(o.data.template_id),enabled:!!((u=o.data)!=null&&u.template_id)}),i=$({queryKey:z.answers(t),queryFn:()=>ae(t),enabled:!!t}),[f,A]=R.useState({}),[C,v]=R.useState(!1);R.useEffect(()=>{if(!i.data)return;const c=i.data.map(y=>y.id);if(!c.length){v(!0);return}Y(c).then(async y=>{const j={};await Promise.all(Object.entries(y).map(async([G,U])=>{j[G]=await Promise.all(U.map(async q=>{try{const X=await ie(q.storage_path);return{...q,storage_path:X}}catch{return q}}))})),A(j),v(!0)}).catch(()=>v(!0))},[i.data]);const h=o.isSuccess&&P.isSuccess&&p.isSuccess&&m.isSuccess&&i.isSuccess&&C;if(o.isLoading)return w.jsx("p",{style:{padding:24},children:"იტვირთება…"});if(!o.data)return w.jsx("p",{style:{padding:24},children:"აქტი ვერ მოიძებნა."});if(!h)return w.jsx("p",{style:{padding:24},children:"იტვირთება…"});const x=o.data,L=P.data,D=p.data,N=m.data??[],T=i.data??[],k=D||{id:x.template_id,owner_id:null,name:"შემოწმების აქტი",category:((b=(S=x.template)==null?void 0:S[0])==null?void 0:b.category)??null,is_system:!1,required_qualifications:[],required_signer_roles:[]},g=mt({questionnaire:x,template:k,signaturesSession:l,project:L,questions:N,answers:T,photosByAnswer:f,mode:"pdf"});return w.jsxs(w.Fragment,{children:[w.jsxs("div",{style:{position:"sticky",top:0,background:"#FAFAFA",borderBottom:"1px solid #E5E7EB",padding:"10px 16px",display:"flex",gap:8,justifyContent:"flex-end",zIndex:10},children:[w.jsx("button",{onClick:()=>window.history.back(),style:{padding:"6px 14px",borderRadius:6,fontSize:13,fontWeight:600,cursor:"pointer",border:"1px solid #D1D5DB",background:"#fff"},children:"დახურვა"}),w.jsx("button",{onClick:()=>{var c,y;return(y=(c=d.current)==null?void 0:c.contentWindow)==null?void 0:y.print()},style:{padding:"6px 14px",borderRadius:6,fontSize:13,fontWeight:600,cursor:"pointer",border:"1px solid #2F855A",background:"#2F855A",color:"#fff"},children:"ბეჭდვა"})]}),w.jsx("iframe",{ref:d,srcDoc:g,style:{width:"100%",height:"calc(100vh - 53px)",border:"none",display:"block"},title:"შემოწმების აქტი",onLoad:()=>{var c,y;r||(y=(c=d.current)==null?void 0:c.contentWindow)==null||y.print()}})]})}export{St as default};
